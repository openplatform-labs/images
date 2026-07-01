import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { config } from "./config";

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "catalog.sqlite");

let database: Database.Database | null = null;

function ensureDataDirectory(): void {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
}

function initializeSchema(databaseInstance: Database.Database): void {
  databaseInstance.exec(`
    CREATE TABLE IF NOT EXISTS logos (
      shortname TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT,
      collection TEXT NOT NULL DEFAULT 'simple',
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logo_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortname TEXT NOT NULL,
      filename TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'default',
      UNIQUE(shortname, filename),
      FOREIGN KEY (shortname) REFERENCES logos(shortname) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logo_categories (
      logo_shortname TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (logo_shortname, category_id),
      FOREIGN KEY (logo_shortname) REFERENCES logos(shortname) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logo_tags (
      logo_shortname TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (logo_shortname, tag_id),
      FOREIGN KEY (logo_shortname) REFERENCES logos(shortname) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_logo_files_shortname ON logo_files(shortname);
    CREATE INDEX IF NOT EXISTS idx_logo_categories_category ON logo_categories(category_id);
    CREATE INDEX IF NOT EXISTS idx_logo_tags_tag ON logo_tags(tag_id);

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL COLLATE NOCASE,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'login',
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_auth_codes_email ON auth_codes(email);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
  `);

  seedDefaultCategories(databaseInstance);
  seedDefaultAdmin(databaseInstance);
  migrateSchema(databaseInstance);
}

function migrateSchema(databaseInstance: Database.Database): void {
  const logoColumns = databaseInstance
    .prepare("PRAGMA table_info(logos)")
    .all() as { name: string }[];
  const logoColumnNames = new Set(logoColumns.map((column) => column.name));

  if (!logoColumnNames.has("collection")) {
    databaseInstance.exec(
      "ALTER TABLE logos ADD COLUMN collection TEXT NOT NULL DEFAULT 'simple'",
    );
  }
  if (!logoColumnNames.has("source")) {
    databaseInstance.exec("ALTER TABLE logos ADD COLUMN source TEXT");
  }

  const fileColumns = databaseInstance
    .prepare("PRAGMA table_info(logo_files)")
    .all() as { name: string }[];
  const fileColumnNames = new Set(fileColumns.map((column) => column.name));

  if (!fileColumnNames.has("variant")) {
    databaseInstance.exec(
      "ALTER TABLE logo_files ADD COLUMN variant TEXT NOT NULL DEFAULT 'default'",
    );
  }

  databaseInstance.exec(
    "CREATE INDEX IF NOT EXISTS idx_logos_collection ON logos(collection)",
  );
}

function seedDefaultCategories(databaseInstance: Database.Database): void {
  const count = databaseInstance
    .prepare("SELECT COUNT(*) as count FROM categories")
    .get() as { count: number };

  if (count.count > 0) return;

  const defaults = [
    { name: "AI", slug: "ai", description: "인공지능 · LLM · ML", sortOrder: 1 },
    { name: "DevOps", slug: "devops", description: "CI/CD · 인프라 · 배포", sortOrder: 2 },
    { name: "Frontend", slug: "frontend", description: "UI · 프레임워크 · CSS", sortOrder: 3 },
    { name: "Backend", slug: "backend", description: "서버 · API · 런타임", sortOrder: 4 },
    { name: "Cloud", slug: "cloud", description: "클라우드 · 호스팅", sortOrder: 5 },
    { name: "Database", slug: "database", description: "DB · 스토리지", sortOrder: 6 },
    { name: "Mobile", slug: "mobile", description: "iOS · Android · 크로스플랫폼", sortOrder: 7 },
    { name: "Design", slug: "design", description: "디자인 · 크리에이티브 툴", sortOrder: 8 },
    { name: "Tools", slug: "tools", description: "개발 도구 · 유틸리티", sortOrder: 9 },
  ];

  const insert = databaseInstance.prepare(`
    INSERT INTO categories (name, slug, description, sort_order)
    VALUES (@name, @slug, @description, @sortOrder)
  `);

  const insertMany = databaseInstance.transaction(
    (rows: typeof defaults) => {
      for (const row of rows) insert.run(row);
    },
  );

  insertMany(defaults);
}

/** 환경 변수 기반 최초 관리자 계정 생성 */
function seedDefaultAdmin(databaseInstance: Database.Database): void {
  const count = databaseInstance
    .prepare("SELECT COUNT(*) as count FROM admins")
    .get() as { count: number };

  if (count.count > 0) return;

  const email = config.adminEmail;
  const password = config.adminPassword;

  if (!email || !password) return;

  const passwordHash = bcrypt.hashSync(password, 10);
  databaseInstance
    .prepare(
      `INSERT INTO admins (email, password_hash, name)
       VALUES (?, ?, ?)`,
    )
    .run(email, passwordHash, "최초 관리자");
}

/** 싱글톤 SQLite 인스턴스 */
export function getDatabase(): Database.Database {
  if (database) return database;

  ensureDataDirectory();
  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  initializeSchema(database);

  return database;
}