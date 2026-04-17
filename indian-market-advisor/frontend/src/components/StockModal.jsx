import React, { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown, Activity, BarChart2, Loader2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { getStockAnalysis } from '../services/api'

function ScoreBar({ label, value, color = 'bg-blue-500' }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-semibold">{value?.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, value || 0)}%` }}
        />
      </div>
    </div>
  )
}

function Metric({ label, value, flag }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold ${flag === 'good' ? 'text-green-400' : flag === 'bad' ? 'text-red-400' : 'text-gray-300'}`}>
        {value}
      </span>
    </div>
  )
}

function SignalPill({ value, neutralColor = 'bg-gray-700 text-gray-300' }) {
  if (!value) return null
  const lower = value.toLowerCase()
  let cls = neutralColor
  if (['bullish', 'golden_cross', 'buy', 'oversold'].includes(lower)) cls = 'bg-green-900/60 text-green-400'
  if (['bearish', 'death_cross', 'sell', 'overbought'].includes(lower)) cls = 'bg-red-900/60 text-red-400'
  const label = value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
}

export default function StockModal({ ticker, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    getStockAnalysis(ticker)
      .then(setData)
      .catch(e => setError(e.response?.data?.detail || 'Failed to load analysis'))
      .finally(() => setLoading(false))
  }, [ticker])

  if (!ticker) return null

  const t = data?.technical || {}
  const f = data?.fundamental || {}
  const s = data?.scores || {}
  const flags = data?.fundamental_flags || {}

  const chartData = (t.price_30d_dates || []).map((date, i) => ({
    date: date.slice(5),
    price: t.price_30d_data?.[i],
  }))

  const formatINR = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'
  const formatPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A'
  const fmtCap = (v) => {
    if (!v) return 'N/A'
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`
    if (v >= 1e9) return `₹${(v / 1e9).toFixed(1)}B`
    return `₹${(v / 1e6).toFixed(0)}M`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-white text-lg">{data?.name || ticker.replace('.NS', '')}</h2>
            <span className="text-xs text-gray-500 font-mono">{ticker}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Current price */}
              <div className="flex items-center gap-4 p-3 bg-gray-950/60 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-white">{formatINR(t.current_price)}</div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${t.price_change_pct_1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.price_change_pct_1d >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {t.price_change_pct_1d >= 0 ? '+' : ''}{t.price_change_pct_1d?.toFixed(2)}% today
                  </div>
                </div>
                <div className="ml-auto text-right text-xs text-gray-500 space-y-0.5">
                  <div>52W High: <span className="text-gray-300">{formatINR(f.fifty_two_week_high)}</span></div>
                  <div>52W Low: <span className="text-gray-300">{formatINR(f.fifty_two_week_low)}</span></div>
                  <div>{flags.cap}</div>
                </div>
              </div>

              {/* Composite scores */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-200">Composite Score</h3>
                </div>
                <ScoreBar label="Composite" value={s.composite} color={s.composite >= 60 ? 'bg-green-500' : s.composite <= 40 ? 'bg-red-500' : 'bg-amber-500'} />
                <ScoreBar label="Technical (50%)" value={s.technical} color="bg-blue-500" />
                <ScoreBar label="Fundamental (30%)" value={s.fundamental} color="bg-purple-500" />
                <ScoreBar label="News Sentiment (20%)" value={s.news_sentiment} color="bg-teal-500" />
              </div>

              {/* 30-day chart */}
              {chartData.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-200">30-Day Price</h3>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={55}
                          tickFormatter={v => `₹${v.toLocaleString('en-IN')}`} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                          formatter={(v) => [`₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Price']}
                        />
                        {t.sma50 && <ReferenceLine y={t.sma50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'SMA50', fill: '#f59e0b', fontSize: 9 }} />}
                        <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Technical indicators */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Technical Indicators</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/40 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">RSI (14)</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-200">{t.rsi?.toFixed(1)}</span>
                        <SignalPill value={t.rsi_signal} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">MACD</span>
                      <SignalPill value={t.macd_crossover} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Bollinger</span>
                      <SignalPill value={t.bb_signal} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">MA Signal</span>
                      <SignalPill value={t.ma_signal} />
                    </div>
                  </div>
                  <div className="bg-gray-800/40 rounded-lg p-3 space-y-1.5">
                    <Metric label="ATR" value={t.atr ? `${formatINR(t.atr)} (${t.atr_pct}%)` : null} />
                    <Metric label="SMA 50" value={formatINR(t.sma50)} />
                    <Metric label="SMA 200" value={t.sma200 ? formatINR(t.sma200) : 'N/A'} />
                    <Metric label="Vol Spike" value={t.volume_spike ? `Yes (${t.volume_ratio}x)` : `No (${t.volume_ratio}x)`}
                      flag={t.volume_spike ? 'good' : undefined} />
                  </div>
                </div>
              </div>

              {/* Fundamentals */}
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Fundamentals</h3>
                <div className="bg-gray-800/40 rounded-lg p-3">
                  <Metric label="P/E Ratio" value={f.pe_ratio?.toFixed(1)} flag={f.pe_ratio < 15 ? 'good' : f.pe_ratio > 35 ? 'bad' : undefined} />
                  <Metric label="P/B Ratio" value={f.pb_ratio?.toFixed(2)} />
                  <Metric label="ROE" value={formatPct(f.roe)} flag={f.roe > 0.2 ? 'good' : f.roe < 0 ? 'bad' : undefined} />
                  <Metric label="Debt / Equity" value={f.debt_to_equity?.toFixed(2)} flag={f.debt_to_equity < 0.5 ? 'good' : f.debt_to_equity > 2 ? 'bad' : undefined} />
                  <Metric label="EPS (TTM)" value={f.eps?.toFixed(2)} />
                  <Metric label="EPS Growth YoY" value={formatPct(f.earnings_growth)} flag={f.earnings_growth > 0.1 ? 'good' : f.earnings_growth < 0 ? 'bad' : undefined} />
                  <Metric label="Market Cap" value={fmtCap(f.market_cap)} />
                  <Metric label="Sector" value={f.sector} />
                  <Metric label="Beta" value={f.beta?.toFixed(2)} />
                  <Metric label="Dividend Yield" value={f.dividend_yield ? formatPct(f.dividend_yield) : 'N/A'} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
