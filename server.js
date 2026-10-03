import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 10000

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    // Render Health Check Endpoint
    if (urlObj.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: "Yoda's Sheep Torn Command" }))
      return
    }

    // Torn API Proxy (/api/torn/* -> https://api.torn.com/*)
    if (urlObj.pathname.startsWith('/api/torn')) {
      const targetPath = urlObj.pathname.replace(/^\/api\/torn/, '') || '/'
      const targetUrl = `https://api.torn.com${targetPath}${urlObj.search}`

      const apiRes = await fetch(targetUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'YodasSheepTornCommand/2.4'
        }
      })
      const body = await apiRes.text()
      res.writeHead(apiRes.status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      })
      res.end(body)
      return
    }

    // Serve Static Files from dist/
    let safePath = path.normalize(decodeURIComponent(urlObj.pathname)).replace(/^(\.\.[/\\])+/, '')
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html'
    }

    let filePath = path.join(DIST_DIR, safePath)

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html')
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const content = fs.readFileSync(filePath)

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Yoda's Sheep // Torn Leadership Server listening on http://0.0.0.0:${PORT}`)
})
