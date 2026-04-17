import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Target, ShieldAlert, Calendar, AlertTriangle } from 'lucide-react'

function ConfidenceBadge({ level }) {
  const cls = level === 'HIGH' ? 'badge-high' : level === 'MEDIUM' ? 'badge-medium' : 'badge-low'
  return <span className={cls}>{level}</span>
}

function PriceLine({ label, value, color = 'text-gray-300' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        ₹{typeof value === 'number' ? value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : value}
      </span>
    </div>
  )
}

export default function RecommendationCard({ rec, rank, onTickerClick }) {
  const [expanded, setExpanded] = useState(false)

  if (!rec) return null

  const isBuy = rec.action === 'BUY'
  const priceDiff = rec.target_price - rec.current_price
  const pricePct = rec.current_price ? (priceDiff / rec.current_price) * 100 : 0

  return (
    <div className={`card border ${isBuy ? 'border-green-900/60' : 'border-red-900/60'} flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-bold text-gray-300 shrink-0">#{rank}</span>
          <div className="min-w-0">
            <button
              onClick={() => onTickerClick?.(rec.ticker)}
              className="font-bold text-white hover:text-blue-400 transition-colors truncate block text-left"
            >
              {rec.name || rec.ticker.replace('.NS', '')}
            </button>
            <span className="text-xs text-gray-500">{rec.ticker}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge level={rec.confidence} />
          <span className={isBuy ? 'badge-buy' : 'badge-sell'}>
            {isBuy ? '↑ BUY' : '↓ SELL'}
          </span>
        </div>
      </div>

      {/* Price strip */}
      <div className="grid grid-cols-3 gap-2 bg-gray-950/60 rounded-lg p-3">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-0.5">Current</div>
          <div className="text-sm font-bold text-gray-200">
            ₹{rec.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-center border-x border-gray-800">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Target className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">Target</span>
          </div>
          <div className={`text-sm font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
            ₹{rec.target_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <ShieldAlert className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">Stop-loss</span>
          </div>
          <div className="text-sm font-bold text-amber-400">
            ₹{rec.stop_loss?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Upside/downside + horizon */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${pricePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {pricePct >= 0 ? '▲' : '▼'} {Math.abs(pricePct).toFixed(1)}% {isBuy ? 'upside' : 'downside'}
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <Calendar className="w-3 h-3" />
          {rec.time_horizon}
        </span>
      </div>

      {/* Expand / collapse */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-300 transition-colors pt-1 border-t border-gray-800"
      >
        <span>{expanded ? 'Hide' : 'Show'} AI reasoning</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="text-sm text-gray-400 leading-relaxed space-y-3 pt-1">
          <p>{rec.reasoning}</p>
          {rec.key_risks?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Key Risks
              </div>
              <ul className="space-y-1">
                {rec.key_risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="text-gray-600 mt-0.5">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
