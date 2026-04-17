import axios from 'axios'

const BASE = 'http://localhost:8000'

const api = axios.create({ baseURL: BASE, timeout: 35000 })

export const getRecommendations = () => api.get('/api/recommendations').then(r => r.data)
export const getNews = () => api.get('/api/news').then(r => r.data)
export const getWatchlist = () => api.get('/api/watchlist').then(r => r.data)
export const getStockAnalysis = (ticker) => api.get(`/api/stock/${ticker}`).then(r => r.data)
export const analyzeCustomTicker = (ticker) => api.post('/api/analyze', { ticker }).then(r => r.data)
export const manualRefresh = () => api.post('/api/refresh').then(r => r.data)
export const getHealth = () => api.get('/api/health').then(r => r.data)
