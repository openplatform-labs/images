import crypto from "crypto";
import { getDatabase } from "./db";

export function createOAuthExchange(sessionToken: string): string {
  const database = getDatabase();
  const code = crypto.randomBytes(24).toString("hex");

  database
    .prepare(
      `INSERT INTO oauth_exchanges (code, session_token, expires_at)
       VALUES (?, ?, datetime('now', '+2 minutes'))`,
    )
    .run(code, sessionToken);

  return code;
}

export function consumeOAuthExchange(code: string): string | null {
  const database = getDatabase();
  const row = database
    .prepare(
      `SELECT session_token as sessionToken
       FROM oauth_exchanges
       WHERE code = ? AND expires_at > datetime('now')`,
    )
    .get(code) as { sessionToken: string } | undefined;

  if (!row) return null;

  database.prepare("DELETE FROM oauth_exchanges WHERE code = ?").run(code);
  return row.sessionToken;
}

export function purgeExpiredOAuthExchanges(): void {
  const database = getDatabase();
  database
    .prepare("DELETE FROM oauth_exchanges WHERE expires_at <= datetime('now')")
    .run();
}
