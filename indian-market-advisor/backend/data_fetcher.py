import yfinance as yf
import feedparser
import pandas as pd
import re
import logging
from datetime import datetime, timedelta
from typing import Optional
from nifty50_tickers import NIFTY50_TICKERS, NAME_TO_TICKER, TICKER_TO_NAME

logger = logging.getLogger(__name__)

RSS_FEEDS = [
    "https://economictimes.indiatimes.com/markets/rss.cms",
    "https://www.moneycontrol.com/rss/marketsindia.xml",
    "https://feeds.feedburner.com/ndtvprofit-latest",
]


def fetch_live_quotes(tickers: list[str] = None) -> dict:
    """Fetch current price data for NIFTY 50 or given tickers."""
    if tickers is None:
        tickers = NIFTY50_TICKERS

    result = {}
    try:
        data = yf.download(tickers, period="2d", interval="1d", group_by="ticker",
                           auto_adjust=True, progress=False, threads=True)
        for ticker in tickers:
            try:
                if len(tickers) == 1:
                    df = data
                else:
                    df = data[ticker] if ticker in data.columns.get_level_values(0) else pd.DataFrame()

                if df.empty or len(df) == 0:
                    result[ticker] = _fallback_quote(ticker)
                    continue

                last_row = df.iloc[-1]
                prev_row = df.iloc[-2] if len(df) > 1 else last_row
                close = float(last_row["Close"]) if not pd.isna(last_row["Close"]) else 0
                prev_close = float(prev_row["Close"]) if not pd.isna(prev_row["Close"]) else close
                change = close - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0

                result[ticker] = {
                    "ticker": ticker,
                    "name": TICKER_TO_NAME.get(ticker, ticker.replace(".NS", "")),
                    "price": round(close, 2),
                    "change": round(change, 2),
                    "change_pct": round(change_pct, 2),
                    "volume": int(last_row["Volume"]) if not pd.isna(last_row.get("Volume", float("nan"))) else 0,
                    "timestamp": datetime.now().isoformat(),
                }
            except Exception as e:
                logger.warning(f"Error processing {ticker}: {e}")
                result[ticker] = _fallback_quote(ticker)
    except Exception as e:
        logger.error(f"Bulk download failed: {e}")
        for ticker in tickers:
            result[ticker] = _fallback_quote(ticker)

    return result


def _fallback_quote(ticker: str) -> dict:
    return {
        "ticker": ticker,
        "name": TICKER_TO_NAME.get(ticker, ticker.replace(".NS", "")),
        "price": 0,
        "change": 0,
        "change_pct": 0,
        "volume": 0,
        "timestamp": datetime.now().isoformat(),
        "error": "Data unavailable",
    }


def fetch_ohlcv(ticker: str, period: str = "6mo") -> Optional[pd.DataFrame]:
    """Fetch OHLCV data for a single ticker."""
    try:
        df = yf.download(ticker, period=period, interval="1d",
                         auto_adjust=True, progress=False)
        if df.empty:
            return None
        df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
        df = df.dropna()
        return df
    except Exception as e:
        logger.error(f"OHLCV fetch failed for {ticker}: {e}")
        return None


def fetch_stock_info(ticker: str) -> dict:
    """Fetch fundamental data from yfinance."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        return {
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "debt_to_equity": info.get("debtToEquity"),
            "roe": info.get("returnOnEquity"),
            "eps": info.get("trailingEps"),
            "forward_eps": info.get("forwardEps"),
            "market_cap": info.get("marketCap"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "dividend_yield": info.get("dividendYield"),
            "beta": info.get("beta"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
        }
    except Exception as e:
        logger.error(f"Info fetch failed for {ticker}: {e}")
        return {}


def fetch_news() -> list[dict]:
    """Fetch and parse news from RSS feeds, extract stock tickers."""
    articles = []
    seen_titles = set()

    for feed_url in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:30]:
                title = entry.get("title", "").strip()
                if not title or title in seen_titles:
                    continue
                seen_titles.add(title)

                summary = entry.get("summary", entry.get("description", ""))
                link = entry.get("link", "")
                published = entry.get("published", datetime.now().isoformat())

                tickers_mentioned = extract_tickers_from_text(title + " " + summary)

                articles.append({
                    "title": title,
                    "summary": summary[:300] if summary else "",
                    "link": link,
                    "published": published,
                    "source": feed.feed.get("title", feed_url),
                    "tickers": tickers_mentioned,
                })
        except Exception as e:
            logger.warning(f"RSS fetch failed for {feed_url}: {e}")

    articles.sort(key=lambda x: x["published"], reverse=True)
    return articles[:40]


def extract_tickers_from_text(text: str) -> list[str]:
    """Extract NSE ticker symbols from news text."""
    found = set()
    text_lower = text.lower()

    # Match explicit NSE tickers like RELIANCE, TCS, INFY
    ticker_pattern = re.compile(r'\b([A-Z]{2,12}(?:&[A-Z]+)?(?:-AUTO)?)\b')
    raw_tickers = ticker_pattern.findall(text)
    for raw in raw_tickers:
        candidate = raw + ".NS"
        if candidate in NIFTY50_TICKERS:
            found.add(candidate)

    # Match company names
    for name, ticker in NAME_TO_TICKER.items():
        if name in text_lower:
            found.add(ticker)

    return list(found)


def get_tickers_in_news(news: list[dict]) -> dict[str, int]:
    """Return ticker → mention count mapping from news."""
    mentions: dict[str, int] = {}
    for article in news:
        for ticker in article.get("tickers", []):
            mentions[ticker] = mentions.get(ticker, 0) + 1
    return mentions
