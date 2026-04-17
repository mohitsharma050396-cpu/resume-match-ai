import React, { useEffect, useState, useCallback } from 'react'
import { TrendingUp, AlertTriangle } from 'lucide-react'

import TickerTape from './components/TickerTape'
import MarketSentiment from './components/MarketSentiment'
import RecommendationCard from './components/RecommendationCard'
import NewsFeed from './components/NewsFeed'
import StockModal from './components/StockModal'
import CustomAnalyzer from './components/CustomAnalyzer'
import { getRecommendations, manualRefresh } from './services/api'

export default function App() {
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadRecs = useCallback(async () => {
    try {
      const data = await getRecommendations()
      setRecs(data)
    } catch {
      // silent — backend may still be starting
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecs()
    const id = setInterval(loadRecs, 60000)
    return () => clearInterval(id)
  }, [loadRecs])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await manualRefresh()
      setTimeout(loadRecs, 3000)
    } catch {
      loadRecs()
    } finally {
      setRefreshing(false)
    }
  }

  const recommendations = recs?.recommendations || []
  const sentiment = recs?.market_sentiment || 'NEUTRAL'
  const summary = recs?.market_summary || ''
  const lastUpdated = recs?.last_updated
  const dataLoading = recs?.loading || loading

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="font-bold text-white text-base leading-none">NSE Market Advisor</span>
              <div className="text-xs text-gray-500 leading-none mt-0.5">AI-Powered NIFTY 50 Analysis</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Not SEBI-registered advice
            </span>
          </div>
        </div>
      </header>

      {/* Ticker tape */}
      <TickerTape />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Disclaimer banner */}
        <div className="flex items-center gap-2.5 p-3 bg-amber-900/20 border border-amber-800/40 rounded-xl text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This is AI-generated analysis for informational purposes only.
            It is <strong>not SEBI-registered investment advice</strong>. Always consult a qualified financial advisor before investing.
          </span>
        </div>

        {/* Market sentiment */}
        <MarketSentiment
          sentiment={sentiment}
          summary={summary}
          lastUpdated={lastUpdated}
          loading={dataLoading}
          onRefresh={handleRefresh}
        />

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Recommendations (3/5 width) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-200">
                Top 5 Recommendations
                {refreshing && <span className="ml-2 text-xs text-blue-400 animate-pulse">Refreshing…</span>}
              </h2>
              {recommendations.length > 0 && (
                <span className="text-xs text-gray-600">
                  {recommendations.filter(r => r.action === 'BUY').length} BUY ·{' '}
                  {recommendations.filter(r => r.action === 'SELL').length} SELL
                </span>
              )}
            </div>

            {dataLoading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="card animate-pulse space-y-3">
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-800 rounded w-1/3" />
                      <div className="h-4 bg-gray-800 rounded w-16" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(3)].map((_, j) => <div key={j} className="h-10 bg-gray-800 rounded" />)}
                    </div>
                    <div className="h-3 bg-gray-800 rounded w-1/4" />
                  </div>
                ))}
              </div>
            )}

            {!dataLoading && recommendations.length === 0 && (
              <div className="card text-center py-12 text-gray-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="font-medium text-gray-400">Analysis in progress…</p>
                <p className="text-sm mt-1">The backend is fetching live data and running AI analysis. This takes ~60 seconds on first load.</p>
              </div>
            )}

            {!dataLoading && recommendations.map((rec, i) => (
              <RecommendationCard
                key={rec.ticker}
                rec={rec}
                rank={i + 1}
                onTickerClick={setSelectedTicker}
              />
            ))}

            {/* Custom Analyzer */}
            <CustomAnalyzer onResult={(result, ticker) => setSelectedTicker(ticker)} />
          </div>

          {/* Right: News feed (2/5 width) */}
          <div className="lg:col-span-2">
            <NewsFeed onTickerClick={setSelectedTicker} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-700 py-4 border-t border-gray-900">
          Indian Market Advisor · Powered by Claude AI · Data from NSE via yfinance ·{' '}
          <span className="text-amber-800">Not investment advice</span>
        </div>
      </main>

      {/* Stock detail modal */}
      {selectedTicker && (
        <StockModal ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}
    </div>
  )
}
