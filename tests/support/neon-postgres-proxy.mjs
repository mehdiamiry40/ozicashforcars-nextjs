import { createServer } from "node:http";
import { once } from "node:events";

// Implements only transport, never quote behavior. Each request uses a real
// PostgreSQL connection; Neon batch requests use one BEGIN/COMMIT transaction.
export async function startNeonPostgresProxy({ pool, databaseUrl, token }) {
  const server = createServer(async (request, response) => {
    const send = (status, value) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(value));
    };
    if (request.method !== "POST" || request.url !== "/sql"
      || request.headers.authorization !== `Bearer ${token}`
      || request.headers["neon-connection-string"] !== databaseUrl) {
      send(403, { message: "Only the isolated test connection is allowed" });
      return;
    }
    let client;
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 1_000_000) throw new Error("Test SQL request is too large");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const batch = Array.isArray(body.queries);
      const queries = batch ? body.queries : [body];
      client = await pool.connect();
      if (batch) {
        const isolation = request.headers["neon-batch-isolation-level"] ?? "ReadCommitted";
        const levels = { ReadCommitted: "READ COMMITTED", RepeatableRead: "REPEATABLE READ", Serializable: "SERIALIZABLE" };
        if (!Object.hasOwn(levels, isolation)) throw new Error("Unsupported test isolation level");
        const readOnly = request.headers["neon-batch-read-only"] === "true";
        const deferrable = request.headers["neon-batch-deferrable"] === "true";
        await client.query(`BEGIN ISOLATION LEVEL ${levels[isolation]} ${readOnly ? "READ ONLY" : "READ WRITE"} ${deferrable ? "DEFERRABLE" : "NOT DEFERRABLE"}`);
      }
      const results = [];
      for (const query of queries) {
        const result = await client.query({
          text: query.query,
          values: query.params ?? [],
          rowMode: "array",
          types: { getTypeParser: () => (value) => value },
        });
        results.push({ command: result.command, rowCount: result.rowCount, fields: result.fields, rows: result.rows });
      }
      if (batch) await client.query("COMMIT");
      send(200, batch ? { results } : results[0]);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      send(400, { message: error.message, code: error.code, detail: error.detail, constraint: error.constraint });
    } finally {
      client?.release();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    url: `http://127.0.0.1:${server.address().port}/sql`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
