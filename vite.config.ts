import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'torn-api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/torn', async (req, res) => {
          try {
            const urlObj = new URL(req.url || '/', 'http://localhost')
            const targetPath = urlObj.pathname.replace(/^\/api\/torn/, '') || '/'
            const targetUrl = `https://api.torn.com${targetPath}${urlObj.search}`
            const response = await fetch(targetUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'TornVanguardCommand/2.0'
              }
            })
            const data = await response.text()
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch (err: any) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: { code: 500, error: err?.message || 'Proxy request failed' } }))
          }
        })
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  }
})
