import React, { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { getWatchlist } from '../services/api'

export default function TickerTape() {
  const [tickers, setTickers] = useState([])
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      const data = await getWatchlist()
      setTickers(data.tickers || [])
      setError(false)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (error) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 text-xs text-amber-400 flex items-center gap-2">
        <RefreshCw className="w-3 h-3" />
        Live prices unavailable — backend may be starting up
      </div>
    )
  }

  if (!tickers.length) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 text-xs text-gray-500 animate-pulse">
        Loading market data…
      </div>
    )
  }

  // Duplicate for seamless scroll
  const items = [...tickers, ...tickers]

  return (
    <div className="bg-gray-900 border-b border-gray-800 py-2 ticker-wrap select-none">
      <div className="ticker-inner gap-0">
        {items.map((t, i) => {
          const up = t.change_pct >= 0
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-4 text-xs border-r border-gray-800"
            >
              <span className="font-semibold text-gray-200">
                {t.ticker.replace('.NS', '')}
              </span>
              <span className={up ? 'text-green-400' : 'text-red-400'}>
                ₹{t.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center gap-0.5 ${up ? 'text-green-500' : 'text-red-500'}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {up ? '+' : ''}{t.change_pct?.toFixed(2)}%
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
