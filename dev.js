const http = require('http');
const fs = require('fs');
const path = require('path');
const weatherHandler = require('./api/weather');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/weather') {
    request.query = Object.fromEntries(url.searchParams);
    response.status = (statusCode) => {
      response.statusCode = statusCode;
      return response;
    };
    response.json = (body) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(body));
    };

    try {
      await weatherHandler(request, response);
    } catch (error) {
      console.error(error);
      if (!response.writableEnded) {
        response.statusCode = 500;
        response.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(ROOT, requestedPath);

  if (!filePath.startsWith(ROOT + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Weather app running at http://localhost:${PORT}`);
});
