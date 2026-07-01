import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDatabase } from "./db";
import { config } from "./config";

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

function mapAdmin(row: {
  id: number;
  email: string;
  name: string | null;
  is_active: number;
  created_at: string;
}): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

export function findAdminByEmail(email: string): (AdminUser & { passwordHash: string }) | null {
  const database = getDatabase();
  const row = database
    .prepare(
      `SELECT id, email, name, password_hash as passwordHash, is_active, created_at
       FROM admins WHERE email = ? COLLATE NOCASE`,
    )
    .get(email) as
    | {
        id: number;
        email: string;
        name: string | null;
        passwordHash: string;
        is_active: number;
        created_at: string;
      }
    | undefined;

  if (!row || row.is_active !== 1) return null;

  return {
    ...mapAdmin(row),
    passwordHash: row.passwordHash,
  };
}

export function verifyAdminPassword(email: string, password: string): AdminUser | null {
  const admin = findAdminByEmail(email);
  if (!admin) return null;
  if (!bcrypt.compareSync(password, admin.passwordHash)) return null;
  const { passwordHash: _, ...user } = admin;
  return user;
}

export function listAdmins(): AdminUser[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `SELECT id, email, name, is_active, created_at FROM admins ORDER BY created_at`,
    )
    .all() as {
    id: number;
    email: string;
    name: string | null;
    is_active: number;
    created_at: string;
  }[];

  return rows.map(mapAdmin);
}

export function createAdmin(params: {
  email: string;
  password: string;
  name?: string;
}): AdminUser {
  const database = getDatabase();
  const passwordHash = bcrypt.hashSync(params.password, 10);

  const result = database
    .prepare(
      `INSERT INTO admins (email, password_hash, name)
       VALUES (?, ?, ?)`,
    )
    .run(params.email.toLowerCase(), passwordHash, params.name ?? null);

  const row = database
    .prepare("SELECT id, email, name, is_active, created_at FROM admins WHERE id = ?")
    .get(result.lastInsertRowid) as {
    id: number;
    email: string;
    name: string | null;
    is_active: number;
    created_at: string;
  };

  return mapAdmin(row);
}

export function updateAdminPassword(adminId: number, newPassword: string): void {
  const database = getDatabase();
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  database
    .prepare(
      `UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(passwordHash, adminId);
}

export function deactivateAdmin(adminId: number): void {
  const database = getDatabase();
  database
    .prepare(`UPDATE admins SET is_active = 0, updated_at = datetime('now') WHERE id = ?`)
    .run(adminId);
  database.prepare("DELETE FROM admin_sessions WHERE admin_id = ?").run(adminId);
}

export function createAuthCode(email: string, purpose: "login" | "reset"): string {
  const database = getDatabase();
  const code = String(crypto.randomInt(100000, 999999));

  database
    .prepare(
      `INSERT INTO auth_codes (email, code, purpose, expires_at)
       VALUES (?, ?, ?, datetime('now', '+' || ? || ' minutes'))`,
    )
    .run(email.toLowerCase(), code, purpose, config.otpExpireMinutes);

  return code;
}

export function verifyAuthCode(
  email: string,
  code: string,
  purpose: "login" | "reset",
): boolean {
  const database = getDatabase();
  const row = database
    .prepare(
      `SELECT id FROM auth_codes
       WHERE email = ? COLLATE NOCASE AND code = ? AND purpose = ?
         AND used_at IS NULL AND expires_at > datetime('now')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(email.toLowerCase(), code, purpose) as { id: number } | undefined;

  if (!row) return false;

  database
    .prepare("UPDATE auth_codes SET used_at = datetime('now') WHERE id = ?")
    .run(row.id);

  return true;
}

export function createSession(adminId: number): string {
  const database = getDatabase();
  const token = crypto.randomBytes(32).toString("hex");

  database
    .prepare(
      `INSERT INTO admin_sessions (token, admin_id, expires_at)
       VALUES (?, ?, datetime('now', '+' || ? || ' days'))`,
    )
    .run(token, adminId, config.sessionDays);

  return token;
}

export function getAdminBySession(token: string): AdminUser | null {
  const database = getDatabase();
  const row = database
    .prepare(
      `SELECT a.id, a.email, a.name, a.is_active, a.created_at
       FROM admin_sessions s
       INNER JOIN admins a ON a.id = s.admin_id
       WHERE s.token = ? AND s.expires_at > datetime('now') AND a.is_active = 1`,
    )
    .get(token) as
    | {
        id: number;
        email: string;
        name: string | null;
        is_active: number;
        created_at: string;
      }
    | undefined;

  if (!row) return null;
  return mapAdmin(row);
}

export function deleteSession(token: string): void {
  const database = getDatabase();
  database.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
}
