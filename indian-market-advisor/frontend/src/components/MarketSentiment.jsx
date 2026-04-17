import React from 'react'
import { TrendingUp, TrendingDown, Minus, Clock, RefreshCw } from 'lucide-react'

const SENTIMENT_CONFIG = {
  BULLISH: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/50', label: 'Bullish' },
  BEARISH: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-900/30 border-red-700/50', label: 'Bearish' },
  NEUTRAL: { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-700/50', label: 'Neutral' },
}

export default function MarketSentiment({ sentiment, summary, lastUpdated, loading, onRefresh }) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL
  const Icon = cfg.icon

  const formatTime = (iso) => {
    if (!iso) return 'Never'
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  return (
    <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${cfg.bg} shrink-0`}>
        <Icon className={`w-5 h-5 ${cfg.color}`} />
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Market Sentiment</div>
          <div className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{summary || 'Market analysis loading…'}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Updated {formatTime(lastUpdated)}</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
