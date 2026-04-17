import React, { useEffect, useState } from 'react'
import { ExternalLink, Newspaper, RefreshCw } from 'lucide-react'
import { getNews } from '../services/api'

function TickerBadge({ ticker, onClick }) {
  return (
    <button
      onClick={() => onClick(ticker)}
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-900/50 text-blue-400 hover:bg-blue-800/60 hover:text-blue-300 transition-colors border border-blue-800/40"
    >
      {ticker.replace('.NS', '')}
    </button>
  )
}

function timeAgo(dateStr) {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}

export default function NewsFeed({ onTickerClick }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    try {
      setError(false)
      const data = await getNews()
      setArticles(data.articles || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 120000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-gray-200">Market News</h2>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[600px] space-y-1 pr-1">
        {loading && (
          [...Array(6)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-gray-800/50 animate-pulse space-y-2">
              <div className="h-3 bg-gray-700 rounded w-4/5" />
              <div className="h-3 bg-gray-700 rounded w-2/5" />
            </div>
          ))
        )}

        {error && (
          <div className="p-4 text-center text-amber-400 text-sm">
            News feed unavailable — backend may be starting up
          </div>
        )}

        {!loading && !error && articles.map((article, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/80 transition-colors group"
          >
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-300 leading-snug group-hover:text-white transition-colors line-clamp-2">
                  {article.title}
                </p>
                <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0 mt-0.5" />
              </div>
            </a>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-gray-600">{article.source}</span>
              <span className="text-xs text-gray-700">·</span>
              <span className="text-xs text-gray-600">{timeAgo(article.published)}</span>
              {article.tickers?.map(t => (
                <TickerBadge key={t} ticker={t} onClick={onTickerClick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
