import pandas as pd
import numpy as np
import logging
from typing import Optional
import ta

from data_fetcher import fetch_ohlcv, fetch_stock_info
from nifty50_tickers import TICKER_TO_NAME

logger = logging.getLogger(__name__)

SECTOR_PE = {
    "Technology": 28,
    "Financial Services": 20,
    "Energy": 15,
    "Consumer Defensive": 30,
    "Healthcare": 25,
    "Industrials": 22,
    "Basic Materials": 18,
    "Consumer Cyclical": 25,
    "Utilities": 18,
    "Real Estate": 20,
    "Communication Services": 22,
}


def compute_technical_indicators(df: pd.DataFrame) -> dict:
    """Compute all technical indicators from OHLCV data."""
    if df is None or len(df) < 30:
        return {}

    close = df["Close"].squeeze()
    high = df["High"].squeeze()
    low = df["Low"].squeeze()
    volume = df["Volume"].squeeze()

    indicators = {}

    try:
        rsi = ta.momentum.RSIIndicator(close=close, window=14)
        rsi_val = float(rsi.rsi().iloc[-1])
        indicators["rsi"] = round(rsi_val, 2)
        indicators["rsi_signal"] = "oversold" if rsi_val < 30 else ("overbought" if rsi_val > 70 else "neutral")
    except Exception:
        indicators["rsi"] = None

    try:
        macd_ind = ta.trend.MACD(close=close)
        macd_val = float(macd_ind.macd().iloc[-1])
        signal_val = float(macd_ind.macd_signal().iloc[-1])
        prev_macd = float(macd_ind.macd().iloc[-2])
        prev_signal = float(macd_ind.macd_signal().iloc[-2])
        indicators["macd"] = round(macd_val, 4)
        indicators["macd_signal"] = round(signal_val, 4)
        bullish_cross = prev_macd < prev_signal and macd_val > signal_val
        bearish_cross = prev_macd > prev_signal and macd_val < signal_val
        indicators["macd_crossover"] = "bullish" if bullish_cross else ("bearish" if bearish_cross else "none")
    except Exception:
        indicators["macd"] = None

    try:
        bb = ta.volatility.BollingerBands(close=close, window=20, window_dev=2)
        bb_upper = float(bb.bollinger_hband().iloc[-1])
        bb_lower = float(bb.bollinger_lband().iloc[-1])
        bb_mid = float(bb.bollinger_mavg().iloc[-1])
        curr_close = float(close.iloc[-1])
        indicators["bb_upper"] = round(bb_upper, 2)
        indicators["bb_lower"] = round(bb_lower, 2)
        indicators["bb_mid"] = round(bb_mid, 2)
        pct_b = (curr_close - bb_lower) / (bb_upper - bb_lower) if (bb_upper - bb_lower) > 0 else 0.5
        indicators["bb_position"] = round(pct_b, 4)
        indicators["bb_signal"] = "buy" if curr_close <= bb_lower * 1.02 else ("sell" if curr_close >= bb_upper * 0.98 else "neutral")
    except Exception:
        indicators["bb_upper"] = None

    try:
        sma50 = float(ta.trend.SMAIndicator(close=close, window=50).sma_indicator().iloc[-1])
        sma200 = float(ta.trend.SMAIndicator(close=close, window=200).sma_indicator().iloc[-1]) if len(df) >= 200 else None
        prev_sma50 = float(ta.trend.SMAIndicator(close=close, window=50).sma_indicator().iloc[-2])
        prev_sma200 = float(ta.trend.SMAIndicator(close=close, window=200).sma_indicator().iloc[-2]) if len(df) >= 200 else None

        indicators["sma50"] = round(sma50, 2)
        indicators["sma200"] = round(sma200, 2) if sma200 else None

        if sma200 and prev_sma50 and prev_sma200:
            if prev_sma50 < prev_sma200 and sma50 > sma200:
                indicators["ma_signal"] = "golden_cross"
            elif prev_sma50 > prev_sma200 and sma50 < sma200:
                indicators["ma_signal"] = "death_cross"
            elif sma50 > sma200:
                indicators["ma_signal"] = "bullish"
            else:
                indicators["ma_signal"] = "bearish"
        else:
            indicators["ma_signal"] = "neutral"
    except Exception:
        indicators["sma50"] = None

    try:
        atr = ta.volatility.AverageTrueRange(high=high, low=low, close=close, window=14)
        atr_val = float(atr.average_true_range().iloc[-1])
        curr_close = float(close.iloc[-1])
        indicators["atr"] = round(atr_val, 2)
        indicators["atr_pct"] = round(atr_val / curr_close * 100, 2) if curr_close else 0
    except Exception:
        indicators["atr"] = None

    try:
        vol_20avg = float(volume.rolling(20).mean().iloc[-1])
        curr_vol = float(volume.iloc[-1])
        indicators["volume_20avg"] = int(vol_20avg)
        indicators["current_volume"] = int(curr_vol)
        indicators["volume_spike"] = curr_vol > 2 * vol_20avg
        indicators["volume_ratio"] = round(curr_vol / vol_20avg, 2) if vol_20avg else 1
    except Exception:
        indicators["volume_spike"] = False

    try:
        curr_close = float(close.iloc[-1])
        indicators["current_price"] = round(curr_close, 2)
        indicators["price_change_1d"] = round(float(close.iloc[-1]) - float(close.iloc[-2]), 2)
        indicators["price_change_pct_1d"] = round((float(close.iloc[-1]) - float(close.iloc[-2])) / float(close.iloc[-2]) * 100, 2)
        indicators["price_30d_data"] = [round(float(p), 2) for p in close.tail(30).tolist()]
        indicators["price_30d_dates"] = [str(d.date()) for d in close.tail(30).index.tolist()]
    except Exception:
        pass

    return indicators


def compute_fundamental_score(info: dict) -> tuple[float, dict]:
    """Compute fundamental score 0-100 and return flag details."""
    score = 50.0
    flags = {}

    pe = info.get("pe_ratio")
    sector = info.get("sector", "")
    sector_pe_avg = SECTOR_PE.get(sector, 22)

    if pe:
        if pe < 15:
            score += 15
            flags["pe"] = f"Undervalued P/E {pe:.1f} (sector avg {sector_pe_avg})"
        elif pe > 35:
            score -= 15
            flags["pe"] = f"Overvalued P/E {pe:.1f} (sector avg {sector_pe_avg})"
        elif pe < sector_pe_avg:
            score += 8
            flags["pe"] = f"Below-sector P/E {pe:.1f}"
        else:
            flags["pe"] = f"P/E {pe:.1f}"
    else:
        flags["pe"] = "P/E data unavailable"

    roe = info.get("roe")
    if roe:
        if roe > 0.20:
            score += 12
            flags["roe"] = f"Strong ROE {roe*100:.1f}%"
        elif roe > 0.12:
            score += 6
            flags["roe"] = f"Moderate ROE {roe*100:.1f}%"
        elif roe < 0:
            score -= 12
            flags["roe"] = f"Negative ROE {roe*100:.1f}%"
        else:
            flags["roe"] = f"Low ROE {roe*100:.1f}%"

    de = info.get("debt_to_equity")
    if de is not None:
        if de < 0.5:
            score += 8
            flags["debt"] = f"Low D/E {de:.2f}"
        elif de > 2.0:
            score -= 10
            flags["debt"] = f"High D/E {de:.2f}"
        else:
            flags["debt"] = f"Moderate D/E {de:.2f}"

    eg = info.get("earnings_growth")
    if eg:
        if eg > 0.20:
            score += 10
            flags["earnings_growth"] = f"Strong EPS growth {eg*100:.1f}% YoY"
        elif eg > 0.05:
            score += 5
            flags["earnings_growth"] = f"EPS growth {eg*100:.1f}% YoY"
        elif eg < 0:
            score -= 8
            flags["earnings_growth"] = f"Declining EPS {eg*100:.1f}% YoY"

    market_cap = info.get("market_cap")
    if market_cap:
        if market_cap > 2e12:
            flags["cap"] = "Large Cap"
        elif market_cap > 5e11:
            flags["cap"] = "Mid Cap"
        else:
            flags["cap"] = "Small Cap"

    h52 = info.get("fifty_two_week_high")
    l52 = info.get("fifty_two_week_low")
    curr = info.get("current_price")
    if h52 and l52 and curr:
        pos = (curr - l52) / (h52 - l52) if (h52 - l52) > 0 else 0.5
        flags["52w_position"] = f"{pos*100:.0f}% of 52-week range"
        if pos < 0.25:
            score += 8
        elif pos > 0.85:
            score -= 5

    return max(0, min(100, score)), flags


def compute_technical_score(indicators: dict) -> float:
    """Compute technical score 0-100."""
    score = 50.0

    rsi = indicators.get("rsi")
    if rsi is not None:
        if rsi < 30:
            score += 15
        elif rsi < 45:
            score += 8
        elif rsi > 70:
            score -= 15
        elif rsi > 60:
            score -= 5

    macd_cross = indicators.get("macd_crossover")
    if macd_cross == "bullish":
        score += 12
    elif macd_cross == "bearish":
        score -= 12

    bb_signal = indicators.get("bb_signal")
    if bb_signal == "buy":
        score += 10
    elif bb_signal == "sell":
        score -= 10

    ma_signal = indicators.get("ma_signal")
    if ma_signal == "golden_cross":
        score += 15
    elif ma_signal == "death_cross":
        score -= 15
    elif ma_signal == "bullish":
        score += 5
    elif ma_signal == "bearish":
        score -= 5

    if indicators.get("volume_spike"):
        price_change = indicators.get("price_change_pct_1d", 0)
        if price_change > 0:
            score += 8
        else:
            score -= 5

    return max(0, min(100, score))


def compute_news_sentiment_score(ticker: str, news: list[dict]) -> float:
    """Estimate sentiment score from news mentions (0-100)."""
    score = 50.0
    positive_words = ["surge", "rally", "gains", "profit", "beat", "record", "upgrade",
                      "strong", "growth", "buy", "positive", "outperform", "rises", "jumps"]
    negative_words = ["fall", "drop", "loss", "miss", "downgrade", "weak", "decline",
                      "sell", "negative", "underperform", "slump", "crash", "cut", "poor"]

    count = 0
    for article in news:
        if ticker in article.get("tickers", []):
            text = (article.get("title", "") + " " + article.get("summary", "")).lower()
            pos = sum(1 for w in positive_words if w in text)
            neg = sum(1 for w in negative_words if w in text)
            score += (pos - neg) * 5
            count += 1

    if count == 0:
        return 50.0
    return max(0, min(100, score))


def analyze_stock(ticker: str, news: list[dict] = None) -> dict:
    """Full analysis for a single ticker."""
    if news is None:
        news = []

    df = fetch_ohlcv(ticker)
    if df is None:
        return {"ticker": ticker, "error": "Could not fetch OHLCV data"}

    info = fetch_stock_info(ticker)
    technical = compute_technical_indicators(df)
    fund_score, fund_flags = compute_fundamental_score(info)
    tech_score = compute_technical_score(technical)
    news_score = compute_news_sentiment_score(ticker, news)

    composite = tech_score * 0.5 + fund_score * 0.3 + news_score * 0.2

    return {
        "ticker": ticker,
        "name": TICKER_TO_NAME.get(ticker, ticker.replace(".NS", "")),
        "technical": technical,
        "fundamental": info,
        "fundamental_flags": fund_flags,
        "scores": {
            "technical": round(tech_score, 1),
            "fundamental": round(fund_score, 1),
            "news_sentiment": round(news_score, 1),
            "composite": round(composite, 1),
        },
        "news_mentions": sum(1 for a in news if ticker in a.get("tickers", [])),
    }


def analyze_multiple_stocks(tickers: list[str], news: list[dict]) -> list[dict]:
    """Analyze multiple stocks and rank by composite score."""
    results = []
    for ticker in tickers:
        try:
            result = analyze_stock(ticker, news)
            if "error" not in result:
                results.append(result)
        except Exception as e:
            logger.error(f"Analysis failed for {ticker}: {e}")

    results.sort(key=lambda x: x["scores"]["composite"], reverse=True)
    return results
