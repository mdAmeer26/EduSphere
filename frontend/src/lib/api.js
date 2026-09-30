// Use relative URLs to leverage Vite's proxy configuration
// Proxy is configured in vite.config.js: /api -> http://localhost:8000
export const API_BASE = import.meta.env.VITE_API_BASE || ''
export const apiUrl = (path) => {
  // If API_BASE is set (production), use it; otherwise use relative path (development with proxy)
  return API_BASE ? `${API_BASE}${path}` : path
}
