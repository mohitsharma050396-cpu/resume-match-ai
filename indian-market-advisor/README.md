# Indian Market Advisor

AI-powered NSE/NIFTY 50 stock analysis and recommendation engine.

## Architecture

- **Backend**: FastAPI + yfinance + feedparser + `ta` (technical analysis) + Claude AI
- **Frontend**: React 18 + Tailwind CSS + Recharts
- **AI**: Anthropic Claude `claude-sonnet-4-20250514` for synthesising recommendations
- **Scheduler**: APScheduler auto-refreshes data every 15 minutes

---

## Setup

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

---

### 2. Backend

```bash
cd indian-market-advisor/backend

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

The backend will:
1. Immediately begin fetching live NSE data and news on startup
2. Run Claude AI analysis (~60 seconds first load)
3. Auto-refresh every 15 minutes

API docs available at: http://localhost:8000/docs

---

### 3. Frontend

```bash
cd indian-market-advisor/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open: http://localhost:5173

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recommendations` | Top 5 AI recommendations (cached 15 min) |
| GET | `/api/watchlist` | Live prices for all NIFTY 50 stocks |
| GET | `/api/news` | Latest news with stock ticker highlights |
| GET | `/api/stock/{ticker}` | Full analysis for a specific stock |
| POST | `/api/analyze` | On-demand analysis for any NSE ticker |
| POST | `/api/refresh` | Trigger manual data refresh |
| GET | `/api/health` | Cache status check |

---

## Features

- **Live ticker tape** — NIFTY 50 prices scrolling at top, auto-refreshed every 60s
- **Top 5 AI recommendations** — BUY/SELL with target price, stop-loss, confidence, time horizon
- **Full reasoning** — collapsible AI explanation with specific indicator values cited
- **News feed** — 40 latest articles from ET Markets, Moneycontrol, NDTV Profit; ticker mentions clickable
- **Stock detail modal** — 30-day price chart, all technical indicators, fundamentals table, composite score bars
- **Custom analyzer** — type any NSE ticker for instant on-demand AI analysis
- **Market sentiment** — Bullish/Bearish/Neutral aggregate based on all analysed stocks

---

## Technical Indicators Computed

- RSI (14-period) — oversold/overbought flags
- MACD + signal line crossover detection
- Bollinger Bands — price position and buy/sell signals
- SMA 50 & SMA 200 — Golden Cross / Death Cross detection
- ATR (14-period) — volatility and stop-loss sizing
- Volume spike detection (>2x 20-day average)

## Fundamental Metrics

- P/E vs sector average
- P/B ratio
- Debt-to-Equity
- ROE
- EPS growth YoY
- Market cap classification
- 52-week high/low positioning

---

## Disclaimer

> This application is AI-generated analysis for **informational purposes only**.
> It is **not SEBI-registered investment advice**.
> Past performance does not guarantee future results.
> Always consult a SEBI-registered financial advisor before making investment decisions.

---

## Notes

- NSE tickers use `.NS` suffix with yfinance (auto-appended)
- yfinance rate limits: if hit, cached data is served with a warning
- Claude API: all stocks batched into a single call per refresh cycle to minimise cost
- First load takes ~60–90s as the backend fetches 6 months of OHLCV for up to 15 stocks
