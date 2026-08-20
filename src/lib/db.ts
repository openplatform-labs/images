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
      channel TEXT NOT NULL DEFAULT 'logos',
      shortname TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      collection TEXT NOT NULL DEFAULT 'simple',
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (channel, shortname)
    );

    CREATE TABLE IF NOT EXISTS logo_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL DEFAULT 'logos',
      shortname TEXT NOT NULL,
      filename TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'default',
      UNIQUE(channel, shortname, filename)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      channel TEXT NOT NULL DEFAULT 'logos',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(channel, slug)
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
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logo_tags (
      logo_shortname TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (logo_shortname, tag_id),
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

    CREATE TABLE IF NOT EXISTS oauth_exchanges (
      code TEXT PRIMARY KEY,
      session_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
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
  if (!logoColumnNames.has("preview_filename")) {
    databaseInstance.exec("ALTER TABLE logos ADD COLUMN preview_filename TEXT");
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
  if (!fileColumnNames.has("width")) {
    databaseInstance.exec("ALTER TABLE logo_files ADD COLUMN width INTEGER");
  }
  if (!fileColumnNames.has("height")) {
    databaseInstance.exec("ALTER TABLE logo_files ADD COLUMN height INTEGER");
  }
  if (!fileColumnNames.has("bytes")) {
    databaseInstance.exec("ALTER TABLE logo_files ADD COLUMN bytes INTEGER");
  }

  databaseInstance.exec(
    "CREATE INDEX IF NOT EXISTS idx_logos_collection ON logos(collection)",
  );

  databaseInstance.exec(`
    CREATE TABLE IF NOT EXISTS oauth_exchanges (
      code TEXT PRIMARY KEY,
      session_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 채널(logos|images) 컬럼 — 기존 데이터는 logos
  if (!logoColumnNames.has("channel")) {
    databaseInstance.exec(
      "ALTER TABLE logos ADD COLUMN channel TEXT NOT NULL DEFAULT 'logos'",
    );
  }

  databaseInstance.exec(
    "CREATE INDEX IF NOT EXISTS idx_logos_channel ON logos(channel)",
  );

  migrateLogosCompositePrimaryKey(databaseInstance);

  const categoryColumns = databaseInstance
    .prepare("PRAGMA table_info(categories)")
    .all() as { name: string }[];
  const categoryColumnNames = new Set(
    categoryColumns.map((column) => column.name),
  );

  if (!categoryColumnNames.has("channel")) {
    databaseInstance.exec(
      "ALTER TABLE categories ADD COLUMN channel TEXT NOT NULL DEFAULT 'logos'",
    );
  }

  databaseInstance.exec(
    "CREATE INDEX IF NOT EXISTS idx_categories_channel ON categories(channel)",
  );

  migrateCategoriesChannelSlugUnique(databaseInstance);

  seedImageCategories(databaseInstance);
  seedIllustCategories(databaseInstance);
  seedIconCategories(databaseInstance);
  seedAvatarCategories(databaseInstance);
  migrateJunctionForeignKeys(databaseInstance);
}

/** categories slug UNIQUE → UNIQUE(channel, slug) */
function migrateCategoriesChannelSlugUnique(
  databaseInstance: Database.Database,
): void {
  const table = databaseInstance
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'categories'`,
    )
    .get() as { sql?: string } | undefined;

  if (!table?.sql) return;
  if (/UNIQUE\s*\(\s*channel\s*,\s*slug\s*\)/i.test(table.sql)) return;
  // 이미 채널 복합 UNIQUE면 스킵; 전역 slug UNIQUE만 재구성
  if (!/slug\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(table.sql)) return;

  databaseInstance.exec(`
    CREATE TABLE categories_channel_slug_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      channel TEXT NOT NULL DEFAULT 'logos',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(channel, slug)
    );

    INSERT INTO categories_channel_slug_v2 (
      id, name, slug, description, sort_order, channel, created_at
    )
    SELECT
      id,
      name,
      slug,
      description,
      sort_order,
      COALESCE(channel, 'logos'),
      created_at
    FROM categories;

    DROP TABLE categories;
    ALTER TABLE categories_channel_slug_v2 RENAME TO categories;
    CREATE INDEX IF NOT EXISTS idx_categories_channel ON categories(channel);
  `);
}

/** logos PK를 (channel, shortname)으로 재구성 */
function migrateLogosCompositePrimaryKey(
  databaseInstance: Database.Database,
): void {
  const table = databaseInstance
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'logos'`,
    )
    .get() as { sql: string } | undefined;

  if (!table?.sql) return;
  if (/PRIMARY KEY\s*\(\s*channel\s*,\s*shortname\s*\)/i.test(table.sql)) {
    return;
  }

  databaseInstance.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE logos_channel_v2 (
      channel TEXT NOT NULL DEFAULT 'logos',
      shortname TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      collection TEXT NOT NULL DEFAULT 'simple',
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (channel, shortname)
    );

    INSERT INTO logos_channel_v2 (
      channel, shortname, name, url, collection, source, created_at, updated_at
    )
    SELECT
      COALESCE(channel, 'logos'),
      shortname,
      name,
      url,
      collection,
      source,
      created_at,
      updated_at
    FROM logos;

    DROP TABLE logos;
    ALTER TABLE logos_channel_v2 RENAME TO logos;

    CREATE INDEX IF NOT EXISTS idx_logos_collection ON logos(collection);
    CREATE INDEX IF NOT EXISTS idx_logos_channel ON logos(channel);

    CREATE TABLE IF NOT EXISTS logo_files_channel_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL DEFAULT 'logos',
      shortname TEXT NOT NULL,
      filename TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'default',
      UNIQUE(channel, shortname, filename)
    );

    INSERT OR IGNORE INTO logo_files_channel_v2 (channel, shortname, filename, variant)
    SELECT 'logos', shortname, filename, variant FROM logo_files;

    DROP TABLE logo_files;
    ALTER TABLE logo_files_channel_v2 RENAME TO logo_files;
    CREATE INDEX IF NOT EXISTS idx_logo_files_shortname ON logo_files(shortname);
    CREATE INDEX IF NOT EXISTS idx_logo_files_channel ON logo_files(channel);

    PRAGMA foreign_keys = ON;
  `);
}

/** logo_categories/logo_tags 의 logos(shortname) FK 제거 — 복합 PK와 불일치 */
function migrateJunctionForeignKeys(databaseInstance: Database.Database): void {
  const categoriesSql = databaseInstance
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'logo_categories'`,
    )
    .get() as { sql: string } | undefined;

  if (!categoriesSql?.sql) return;
  if (!/REFERENCES\s+logos\s*\(\s*shortname\s*\)/i.test(categoriesSql.sql)) {
    return;
  }

  databaseInstance.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE logo_categories_v2 (
      logo_shortname TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (logo_shortname, category_id),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    INSERT INTO logo_categories_v2 SELECT logo_shortname, category_id FROM logo_categories;
    DROP TABLE logo_categories;
    ALTER TABLE logo_categories_v2 RENAME TO logo_categories;
    CREATE INDEX IF NOT EXISTS idx_logo_categories_category ON logo_categories(category_id);

    CREATE TABLE logo_tags_v2 (
      logo_shortname TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (logo_shortname, tag_id),
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    INSERT INTO logo_tags_v2 SELECT logo_shortname, tag_id FROM logo_tags;
    DROP TABLE logo_tags;
    ALTER TABLE logo_tags_v2 RENAME TO logo_tags;
    CREATE INDEX IF NOT EXISTS idx_logo_tags_tag ON logo_tags(tag_id);

    PRAGMA foreign_keys = ON;
  `);
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
    INSERT INTO categories (name, slug, description, sort_order, channel)
    VALUES (@name, @slug, @description, @sortOrder, 'logos')
  `);

  const insertMany = databaseInstance.transaction(
    (rows: typeof defaults) => {
      for (const row of rows) insert.run(row);
    },
  );

  insertMany(defaults);
}

/** images 채널용 카테고리 — SPACE IMAGES가 첫 카테고리, 이후 일반 주제 */
function seedImageCategories(databaseInstance: Database.Database): void {
  const legacy = databaseInstance
    .prepare(
      "SELECT COUNT(*) as count FROM categories WHERE channel = 'images' AND slug LIKE 'images-%'",
    )
    .get() as { count: number };

  if (legacy.count > 0) {
    databaseInstance
      .prepare(
        `DELETE FROM logo_categories
         WHERE category_id IN (SELECT id FROM categories WHERE channel = 'images')`,
      )
      .run();
    databaseInstance
      .prepare("DELETE FROM categories WHERE channel = 'images'")
      .run();
  }

  const defaults = [
    {
      name: "SPACE IMAGES",
      slug: "space",
      description: "우주 · NASA · 천체 · 탐사",
      sortOrder: 1,
    },
    {
      name: "Nature",
      slug: "nature",
      description: "자연 · 풍경",
      sortOrder: 2,
    },
    {
      name: "Cities",
      slug: "cities",
      description: "도시 · 건축",
      sortOrder: 3,
    },
    {
      name: "Objects",
      slug: "objects",
      description: "사물 · 제품",
      sortOrder: 4,
    },
    {
      name: "People",
      slug: "people",
      description: "인물 · 라이프",
      sortOrder: 5,
    },
    {
      name: "Abstract",
      slug: "abstract",
      description: "추상 · 텍스처",
      sortOrder: 6,
    },
    {
      name: "Events",
      slug: "events",
      description: "이벤트 · 장면",
      sortOrder: 7,
    },
  ];

  const insert = databaseInstance.prepare(`
    INSERT INTO categories (name, slug, description, sort_order, channel)
    VALUES (@name, @slug, @description, @sortOrder, 'images')
    ON CONFLICT(channel, slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order
  `);

  const insertMany = databaseInstance.transaction((rows: typeof defaults) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(defaults);

  // 기존 우주 세부분류(planets 등)는 SPACE 뒤로 정렬 유지
  const spaceTopicSlugs = [
    "planets",
    "nebulae",
    "galaxies",
    "stars",
    "earth",
    "missions",
  ];
  const bump = databaseInstance.prepare(
    `UPDATE categories
     SET sort_order = ?
     WHERE channel = 'images' AND slug = ?`,
  );
  spaceTopicSlugs.forEach((slug, index) => {
    bump.run(20 + index, slug);
  });

  // NASA 시드 이미지는 SPACE IMAGES 카테고리에 연결
  const spaceCategory = databaseInstance
    .prepare(
      `SELECT id FROM categories WHERE channel = 'images' AND slug = 'space'`,
    )
    .get() as { id: number } | undefined;

  if (spaceCategory) {
    databaseInstance
      .prepare(
        `INSERT OR IGNORE INTO logo_categories (logo_shortname, category_id)
         SELECT shortname, ?
         FROM logos
         WHERE channel = 'images' AND IFNULL(source, '') = 'nasa'`,
      )
      .run(spaceCategory.id);
  }
}

/** illust 채널용 기본 카테고리 */
function seedIllustCategories(databaseInstance: Database.Database): void {
  const count = databaseInstance
    .prepare("SELECT COUNT(*) as count FROM categories WHERE channel = 'illust'")
    .get() as { count: number };

  if (count.count > 0) return;

  const defaults = [
    {
      name: "Characters",
      slug: "characters",
      description: "캐릭터 · 인물",
      sortOrder: 1,
    },
    {
      name: "Objects",
      slug: "objects",
      description: "사물 · 소품",
      sortOrder: 2,
    },
    {
      name: "Scenes",
      slug: "scenes",
      description: "장면 · 배경",
      sortOrder: 3,
    },
    {
      name: "Patterns",
      slug: "patterns",
      description: "패턴 · 텍스처",
      sortOrder: 4,
    },
    {
      name: "Icons",
      slug: "icons",
      description: "아이콘형 일러스트",
      sortOrder: 5,
    },
    {
      name: "UI",
      slug: "ui",
      description: "UI · 제품 그래픽",
      sortOrder: 6,
    },
  ];

  const insert = databaseInstance.prepare(`
    INSERT INTO categories (name, slug, description, sort_order, channel)
    VALUES (@name, @slug, @description, @sortOrder, 'illust')
  `);

  const insertMany = databaseInstance.transaction((rows: typeof defaults) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(defaults);
}

/** icons 채널용 기본 카테고리 */
function seedIconCategories(databaseInstance: Database.Database): void {
  const count = databaseInstance
    .prepare("SELECT COUNT(*) as count FROM categories WHERE channel = 'icons'")
    .get() as { count: number };

  if (count.count > 0) return;

  const defaults = [
    {
      name: "UI",
      slug: "ui",
      description: "인터페이스 · 컨트롤",
      sortOrder: 1,
    },
    {
      name: "Arrows",
      slug: "arrows",
      description: "화살표 · 방향",
      sortOrder: 2,
    },
    {
      name: "Media",
      slug: "media",
      description: "미디어 · 재생",
      sortOrder: 3,
    },
    {
      name: "Devices",
      slug: "devices",
      description: "기기 · 하드웨어",
      sortOrder: 4,
    },
    {
      name: "Commerce",
      slug: "commerce",
      description: "쇼핑 · 결제",
      sortOrder: 5,
    },
    {
      name: "Social",
      slug: "social",
      description: "소셜 · 커뮤니케이션",
      sortOrder: 6,
    },
  ];

  const insert = databaseInstance.prepare(`
    INSERT INTO categories (name, slug, description, sort_order, channel)
    VALUES (@name, @slug, @description, @sortOrder, 'icons')
  `);

  const insertMany = databaseInstance.transaction((rows: typeof defaults) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(defaults);
}

/** avatars 채널용 기본 카테고리 */
function seedAvatarCategories(databaseInstance: Database.Database): void {
  const count = databaseInstance
    .prepare("SELECT COUNT(*) as count FROM categories WHERE channel = 'avatars'")
    .get() as { count: number };

  if (count.count > 0) return;

  const defaults = [
    {
      name: "People",
      slug: "people",
      description: "실사 · 인물 초상",
      sortOrder: 1,
    },
    {
      name: "Characters",
      slug: "characters",
      description: "캐릭터 · 페르소나",
      sortOrder: 2,
    },
    {
      name: "Mascots",
      slug: "mascots",
      description: "마스코트 · 브랜드 얼굴",
      sortOrder: 3,
    },
    {
      name: "Initials",
      slug: "initials",
      description: "이니셜 · 모노그램",
      sortOrder: 4,
    },
    {
      name: "Geometric",
      slug: "geometric",
      description: "기하 · 추상 초상",
      sortOrder: 5,
    },
    {
      name: "3D",
      slug: "3d",
      description: "3D 렌더 아바타",
      sortOrder: 6,
    },
    {
      name: "Animals",
      slug: "animals",
      description: "동물 · 크리처",
      sortOrder: 7,
    },
  ];

  const insert = databaseInstance.prepare(`
    INSERT INTO categories (name, slug, description, sort_order, channel)
    VALUES (@name, @slug, @description, @sortOrder, 'avatars')
  `);

  const insertMany = databaseInstance.transaction((rows: typeof defaults) => {
    for (const row of rows) insert.run(row);
  });

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