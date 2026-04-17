import json
import logging
import os
import time
from typing import Optional
import anthropic
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-20250514"


def _build_stock_summary(analysis: dict) -> str:
    """Condense a single stock analysis into a compact text block."""
    t = analysis.get("technical", {})
    s = analysis.get("scores", {})
    f = analysis.get("fundamental", {})
    flags = analysis.get("fundamental_flags", {})

    lines = [
        f"TICKER: {analysis['ticker']} ({analysis.get('name', '')})",
        f"Composite Score: {s.get('composite', 0)}/100 "
        f"(Tech:{s.get('technical',0)} Fund:{s.get('fundamental',0)} Sentiment:{s.get('news_sentiment',0)})",
        f"Price: ₹{t.get('current_price', 'N/A')}  1d Change: {t.get('price_change_pct_1d', 0)}%",
        f"RSI(14): {t.get('rsi', 'N/A')} [{t.get('rsi_signal', '')}]",
        f"MACD Crossover: {t.get('macd_crossover', 'N/A')}",
        f"Bollinger Band Signal: {t.get('bb_signal', 'N/A')} (position {t.get('bb_position', 'N/A')})",
        f"MA Signal: {t.get('ma_signal', 'N/A')}  SMA50: {t.get('sma50', 'N/A')}  SMA200: {t.get('sma200', 'N/A')}",
        f"Volume Spike: {t.get('volume_spike', False)} (ratio {t.get('volume_ratio', 'N/A')}x)",
        f"ATR: {t.get('atr', 'N/A')} ({t.get('atr_pct', 'N/A')}% of price)",
        f"Fundamentals: P/E={f.get('pe_ratio', 'N/A')} P/B={f.get('pb_ratio', 'N/A')} "
        f"ROE={f.get('roe', 'N/A')} D/E={f.get('debt_to_equity', 'N/A')}",
        f"EPS Growth YoY: {f.get('earnings_growth', 'N/A')}",
        f"Market Cap: {f.get('market_cap', 'N/A')}  Sector: {f.get('sector', 'N/A')}",
        f"52W High/Low: {f.get('fifty_two_week_high', 'N/A')} / {f.get('fifty_two_week_low', 'N/A')}",
        f"Flags: {json.dumps(flags)}",
        f"News Mentions: {analysis.get('news_mentions', 0)}",
    ]
    return "\n".join(lines)


def _build_prompt(analyses: list[dict], news_headlines: list[str]) -> str:
    stock_blocks = "\n\n".join(_build_stock_summary(a) for a in analyses)
    headlines_text = "\n".join(f"- {h}" for h in news_headlines[:20])

    return f"""You are an expert Indian equity analyst. Based on the quantitative analysis below, generate actionable BUY/SELL recommendations for the top 5 most promising stocks from NIFTY 50.

## Recent Market News Headlines
{headlines_text}

## Stock Analysis Data
{stock_blocks}

## Instructions
- Select exactly 5 stocks (can be BUY or SELL, choose based on data)
- For BUY: composite score > 55 with positive technical/fundamental signals
- For SELL: composite score < 45 OR death cross OR RSI overbought + negative fundamentals
- Set realistic target prices using ATR, support/resistance, and fundamental value
- Stop-loss for BUY = current price - 1.5x ATR; for SELL = current price + 1.5x ATR
- Confidence: HIGH if 3+ signals agree, MEDIUM if 2 agree, LOW otherwise
- Reasoning must be specific — cite the actual indicator values

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{{
  "recommendations": [
    {{
      "ticker": "XXX.NS",
      "name": "Company Name",
      "action": "BUY" or "SELL",
      "confidence": "HIGH" or "MEDIUM" or "LOW",
      "current_price": 0.00,
      "target_price": 0.00,
      "stop_loss": 0.00,
      "time_horizon": "X-Y months",
      "reasoning": "Detailed reasoning citing specific indicator values...",
      "key_risks": ["risk1", "risk2", "risk3"]
    }}
  ],
  "market_sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "market_summary": "One paragraph market overview based on the data"
}}"""


def generate_recommendations(analyses: list[dict], news: list[dict], max_retries: int = 2) -> dict:
    """Call Claude API to generate structured recommendations."""
    if not analyses:
        return {"recommendations": [], "market_sentiment": "NEUTRAL", "market_summary": "No data available"}

    news_headlines = [a.get("title", "") for a in news[:20]]

    prompt = _build_prompt(analyses[:15], news_headlines)

    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=4096,
                timeout=30,
                messages=[{"role": "user", "content": prompt}],
            )

            raw = response.content[0].text.strip()

            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            result = json.loads(raw)

            if "recommendations" in result:
                result["recommendations"] = result["recommendations"][:5]
            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
        except anthropic.APITimeoutError:
            logger.error(f"Claude API timeout (attempt {attempt+1})")
            if attempt < max_retries - 1:
                time.sleep(5)
        except Exception as e:
            logger.error(f"Claude API error (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(3)

    return {
        "recommendations": [],
        "market_sentiment": "NEUTRAL",
        "market_summary": "Analysis temporarily unavailable. Please try again later.",
        "error": "Claude API call failed after retries",
    }
