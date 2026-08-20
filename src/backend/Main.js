const http = require("http");
const fs = require("fs");
const path = require("path");
const MathResolver = require("../math/MathResolver.js");
const PhyResolver = require("../physical/PhyResolver.js");

const ROOT_DIR = path.join(__dirname, "..", "..");
const PORT = process.env.PORT || 3000;
const PRESENCE_TIMEOUT_MS = 45000;
const PRESENCE_CLEANUP_MS = PRESENCE_TIMEOUT_MS * 4;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

const mathResolver = new MathResolver();
const physicsResolver = new PhyResolver();
const presenceStore = new Map();

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error("Corpo da requisição muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function parseJsonBody(req) {
  const raw = await readRequestBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("JSON inválido no corpo da requisição.");
  }
}

function serveStaticFile(res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const relativePath = safePath === "/" || safePath === "" ? "index.html" : safePath.replace(/^[/\\]/, "");
  const filePath = path.join(ROOT_DIR, relativePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Acesso negado.");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404);
        res.end("Arquivo não encontrado.");
      } else {
        res.writeHead(500);
        res.end("Erro interno do servidor.");
      }
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function cleanupStalePresence() {
  const now = Date.now();
  for (const [id, entry] of presenceStore) {
    if (now - entry.lastSeen >= PRESENCE_CLEANUP_MS) presenceStore.delete(id);
  }
}

function getOnlineUsers(role) {
  const now = Date.now();
  const users = [];
  for (const [id, entry] of presenceStore) {
    if (now - entry.lastSeen >= PRESENCE_TIMEOUT_MS) continue;
    if (role && entry.role !== role) continue;
    users.push({ id, name: entry.name, role: entry.role, lastSeen: entry.lastSeen });
  }
  return users.sort((a, b) => b.lastSeen - a.lastSeen);
}

async function handleApi(req, res, pathname, searchParams) {
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { status: "ok", timestamp: Date.now() });
    return true;
  }

  if (pathname === "/api/math" && req.method === "POST") {
    const body = await parseJsonBody(req);
    if (!body.input) {
      sendJson(res, 400, { error: 'Envie um campo "input".' });
      return true;
    }
    sendJson(res, 200, mathResolver.resolve(body.input));
    return true;
  }

  if (pathname === "/api/physics" && req.method === "POST") {
    const body = await parseJsonBody(req);
    if (!body.input) {
      sendJson(res, 400, { error: 'Envie um campo "input".' });
      return true;
    }
    sendJson(res, 200, physicsResolver.resolve(body.input));
    return true;
  }

  if (pathname === "/api/presence/heartbeat" && req.method === "POST") {
    const body = await parseJsonBody(req);
    if (!body.id || !body.name) {
      sendJson(res, 400, { error: 'Envie "id" e "name".' });
      return true;
    }
    presenceStore.set(String(body.id), {
      name: String(body.name),
      role: body.role || "aluno",
      lastSeen: Date.now()
    });
    cleanupStalePresence();
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/presence/online" && req.method === "GET") {
    const role = searchParams.get("role") || null;
    sendJson(res, 200, { users: getOnlineUsers(role) });
    return true;
  }

  if (pathname === "/api/presence/leave" && req.method === "POST") {
    const body = await parseJsonBody(req);
    if (body.id) presenceStore.delete(String(body.id));
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname.startsWith("/api/presence/") && req.method === "DELETE") {
    const id = decodeURIComponent(pathname.slice("/api/presence/".length));
    presenceStore.delete(id);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "Rota não encontrada." });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  try {
    const handled = await handleApi(req, res, pathname, parsedUrl.searchParams);
    if (handled) return;

    if (req.method === "GET") {
      serveStaticFile(res, pathname);
      return;
    }

    sendJson(res, 405, { error: "Método não permitido." });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

module.exports = server;
