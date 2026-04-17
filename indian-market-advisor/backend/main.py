import logging
import os
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from cache import cache
from data_fetcher import fetch_live_quotes, fetch_news, get_tickers_in_news
from analyzer import analyze_stock, analyze_multiple_stocks
from recommender import generate_recommendations
from scheduler import start_scheduler, stop_scheduler
from nifty50_tickers import NIFTY50_TICKERS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

CACHE_TTL = 900  # 15 minutes


def refresh_all_data():
    """Full data refresh cycle — runs on startup and every 15 min."""
    logger.info("Starting market data refresh...")
    try:
        news = fetch_news()
        cache.set("news", news, CACHE_TTL)
        logger.info(f"Fetched {len(news)} news articles")

        mentions = get_tickers_in_news(news)
        in_news = list(mentions.keys())

        if len(in_news) < 5:
            from nifty50_tickers import NIFTY50_TICKERS as N50
            import random
            extra = [t for t in N50 if t not in in_news]
            random.shuffle(extra)
            in_news = in_news + extra[:max(10 - len(in_news), 5)]

        logger.info(f"Analyzing {len(in_news)} tickers...")
        analyses = analyze_multiple_stocks(in_news[:15], news)
        cache.set("analyses", analyses, CACHE_TTL)

        quotes = fetch_live_quotes()
        cache.set("quotes", quotes, CACHE_TTL)

        if analyses:
            recs = generate_recommendations(analyses, news)
            cache.set("recommendations", recs, CACHE_TTL)
            logger.info(f"Generated {len(recs.get('recommendations', []))} recommendations")
        else:
            logger.warning("No analyses available for recommendations")

        cache.set("last_updated", datetime.now().isoformat(), CACHE_TTL)
        logger.info("Market data refresh complete")

    except Exception as e:
        logger.error(f"Refresh cycle failed: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler(refresh_all_data, interval_minutes=15)
    yield
    stop_scheduler()


app = FastAPI(
    title="Indian Market Advisor API",
    description="AI-powered NSE stock analysis and recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/recommendations")
def get_recommendations():
    recs = cache.get("recommendations")
    last_updated = cache.get("last_updated")

    if not recs:
        return {
            "recommendations": [],
            "market_sentiment": "NEUTRAL",
            "market_summary": "Data is loading. Please wait a moment and refresh.",
            "last_updated": last_updated,
            "loading": True,
        }

    return {
        **recs,
        "last_updated": last_updated,
        "loading": False,
    }


@app.get("/api/news")
def get_news():
    news = cache.get("news")
    if news is None:
        try:
            from data_fetcher import fetch_news
            news = fetch_news()
            cache.set("news", news, CACHE_TTL)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"News fetch failed: {e}")
    return {"articles": news, "count": len(news)}


@app.get("/api/watchlist")
def get_watchlist():
    quotes = cache.get("quotes")
    if quotes is None:
        try:
            quotes = fetch_live_quotes()
            cache.set("quotes", quotes, CACHE_TTL)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Quote fetch failed: {e}")

    return {
        "tickers": list(quotes.values()),
        "count": len(quotes),
        "last_updated": cache.get("last_updated"),
    }


@app.get("/api/stock/{ticker}")
def get_stock_analysis(ticker: str):
    ticker_upper = ticker.upper()
    if not ticker_upper.endswith(".NS"):
        ticker_upper += ".NS"

    cache_key = f"stock_{ticker_upper}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    news = cache.get("news") or []

    try:
        analysis = analyze_stock(ticker_upper, news)
        if "error" in analysis:
            raise HTTPException(status_code=404, detail=analysis["error"])
        cache.set(cache_key, analysis, 300)
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AnalyzeRequest(BaseModel):
    ticker: str


@app.post("/api/analyze")
def analyze_custom(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    ticker = request.ticker.upper()
    if not ticker.endswith(".NS"):
        ticker += ".NS"

    news = cache.get("news") or []

    try:
        analysis = analyze_stock(ticker, news)
        if "error" in analysis:
            raise HTTPException(status_code=404, detail=analysis["error"])

        analyses = [analysis]
        recs = generate_recommendations(analyses, news)
        return {
            "analysis": analysis,
            "recommendation": recs.get("recommendations", [{}])[0] if recs.get("recommendations") else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "last_updated": cache.get("last_updated"),
        "has_recommendations": cache.get("recommendations") is not None,
        "has_news": cache.get("news") is not None,
        "has_quotes": cache.get("quotes") is not None,
    }


@app.post("/api/refresh")
def manual_refresh(background_tasks: BackgroundTasks):
    background_tasks.add_task(refresh_all_data)
    return {"message": "Refresh started in background"}
