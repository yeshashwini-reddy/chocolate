/**
 * MADHURI'S CHOCO HEAVEN - PRODUCTION WEB SERVER FOR DOCKER & RENDER
 * 
 * High-performance, zero-dependency production server using native Node.js APIs.
 * - Serves optimized production build from `./dist`
 * - Full Single-Page Application (SPA) routing fallback to `index.html`
 * - Gzip compression on-the-fly for text, JavaScript, CSS, and SVG assets
 * - Long-term immutable caching for hashed assets, no-cache for index.html
 * - Essential security headers on every response
 * - Render-compatible health check endpoint at `/healthz`
 * - Native graceful shutdown on SIGTERM / SIGINT
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 10000;
const HOST = '0.0.0.0';
const DIST_DIR = path.resolve(__dirname, 'dist');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=UTF-8'
};

// Check whether compression is beneficial for the given MIME type
function isCompressible(mimeType) {
  return (
    mimeType.startsWith('text/') ||
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('svg')
  );
}

// Server factory
const server = http.createServer((req, res) => {
  // 1. Health check endpoint for Render zero-downtime deployment monitoring
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'madhuris-choco-heaven',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Only allow GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Parse path, remove query params and hash
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, safePath);
  let isSpaFallback = false;

  // Check if requested file exists
  let stats;
  try {
    stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stats = fs.statSync(filePath);
    }
  } catch (_) {
    // If file doesn't exist, route to SPA index.html
    filePath = path.join(DIST_DIR, 'index.html');
    isSpaFallback = true;
    try {
      stats = fs.statSync(filePath);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Build artifacts not found. Please run "npm run build" before starting server.');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Base security headers
  const headers = {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  // Caching policy:
  // - Hashed assets (/assets/): Cache immutable for 1 year
  // - HTML / SPA index.html: No-cache so client always gets latest deployments
  // - Other static files (images, favicons): 1 hour
  if (urlPath.startsWith('/assets/') && !isSpaFallback) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else if (ext === '.html' || isSpaFallback) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  } else {
    headers['Cache-Control'] = 'public, max-age=3600';
  }

  // Check if client accepts gzip compression
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const canGzip = isCompressible(contentType) && acceptEncoding.includes('gzip') && stats.size > 1024;

  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }

  const rawStream = fs.createReadStream(filePath);

  if (canGzip) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    const gzip = zlib.createGzip({ level: 6 });
    rawStream.pipe(gzip).pipe(res);
  } else {
    headers['Content-Length'] = stats.size;
    res.writeHead(200, headers);
    rawStream.pipe(res);
  }

  rawStream.on('error', (err) => {
    console.error(`[Server] Error streaming ${filePath}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
});

// Start listening
server.listen(PORT, HOST, () => {
  console.log(`[Server] Madhuri's Choco Heaven production web server running at http://${HOST}:${PORT}`);
  console.log(`[Server] Serving static files from: ${DIST_DIR}`);
  console.log(`[Server] Health check endpoint: http://${HOST}:${PORT}/healthz`);
});

// Graceful shutdown on termination signals
function gracefulShutdown(signal) {
  console.log(`[Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed. Process exiting cleanly.');
    process.exit(0);
  });

  // Force shutdown after 5 seconds if connections remain open
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
