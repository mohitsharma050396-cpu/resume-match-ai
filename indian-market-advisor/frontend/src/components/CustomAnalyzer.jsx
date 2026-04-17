import React, { useState } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { analyzeCustomTicker } from '../services/api'

const SUGGESTIONS = ['TCS', 'INFY', 'WIPRO', 'HDFCBANK', 'RELIANCE', 'ICICIBANK', 'SBIN', 'ITC']

export default function CustomAnalyzer({ onResult }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = async (ticker = input.trim()) => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeCustomTicker(ticker)
      onResult?.(result, ticker.toUpperCase().replace('.NS', '') + '.NS')
    } catch (e) {
      setError(e.response?.data?.detail || `Could not analyze ${ticker}. Check the ticker symbol.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-200 mb-3">Analyze Any NSE Stock</h2>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter NSE ticker (e.g. TCS, INFY…)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50"
          />
        </div>
        <button
          onClick={() => handleAnalyze()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => { setInput(s); handleAnalyze(s) }}
            disabled={loading}
            className="px-2 py-0.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded border border-gray-700 transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-900/20 border border-red-800/40 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
