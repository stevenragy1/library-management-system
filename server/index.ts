// HTTP API for the library system. Uses only Node's built-in http module.
import http from "node:http";
import { openDatabase, LibraryService, LibraryError } from "./db.js";

const PORT = Number(process.env.PORT ?? 4000);
const service = new LibraryService(openDatabase(process.env.DB_FILE ?? "library.db"));

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function route(req: http.IncomingMessage, url: URL): Promise<unknown> {
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = req.method ?? "GET";
  const [resource, id, action] = parts;

  if (resource === "books") {
    if (!id && method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      const field = (url.searchParams.get("field") ?? "all") as "all";
      return q ? service.searchBooks(q, field) : service.listBooks();
    }
    if (!id && method === "POST") return service.addBook(await readJson(req));
    if (id && method === "GET") return service.getBook(Number(id));
    if (id && method === "PUT") return service.updateBook(Number(id), await readJson(req));
    if (id && method === "DELETE") { service.deleteBook(Number(id)); return { ok: true }; }
  }

  if (resource === "members") {
    if (!id && method === "GET") return service.listMembers();
    if (!id && method === "POST") return service.addMember(await readJson(req));
  }

  if (resource === "transactions") {
    if (!id && method === "GET") return service.listTransactions((url.searchParams.get("status") ?? "all") as "all");
    if (!id && method === "POST") {
      const { bookId, memberId } = await readJson(req);
      return service.issueBook(Number(bookId), Number(memberId));
    }
    if (id && action === "return" && method === "POST") return service.returnBook(Number(id));
  }

  if (resource === "reports" && method === "GET") {
    return service.reports(url.searchParams.get("date") ?? undefined);
  }

  throw new LibraryError("Route not found", 404);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  // Allow the Vite dev server (different port) to call the API.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return send(res, 204, {});
  try {
    send(res, 200, await route(req, url));
  } catch (err) {
    if (err instanceof LibraryError) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => console.log(`Library API running on http://localhost:${PORT}`));
