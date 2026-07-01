import fs from "fs";
import { config, getLogosJsonRemoteUrl } from "./config";
import {
  detectCollection,
  normalizeLogosJsonFiles,
} from "./collection";
import { getDatabase } from "./db";
import { slugify } from "./slug";
import { enrichLogoFiles } from "./logo-files";
import type {
  Category,
  LogoCollection,
  LogoEntry,
  LogoListResult,
  LogosJsonEntry,
  LogosJsonFileEntry,
  Tag,
} from "./types";

const categoryKeywordMap: Record<string, string[]> = {
  ai: ["ai", "gpt", "llm", "ml", "gemini", "claude", "openai", "hugging", "anthropic", "deepseek", "mistral"],
  devops: ["docker", "kubernetes", "k8s", "jenkins", "terraform", "ansible", "gitlab", "github-actions", "circleci", "travis"],
  frontend: ["react", "vue", "angular", "svelte", "next", "nuxt", "vite", "webpack", "tailwind", "css", "html"],
  backend: ["node", "django", "rails", "spring", "express", "fastapi", "laravel", "go", "rust", "java"],
  cloud: ["aws", "azure", "gcp", "google-cloud", "cloudflare", "vercel", "netlify", "heroku", "digitalocean"],
  database: ["mongo", "postgres", "mysql", "redis", "sqlite", "dynamo", "cassandra", "elastic", "db"],
  mobile: ["android", "ios", "flutter", "react-native", "swift", "kotlin", "expo"],
  design: ["figma", "sketch", "adobe", "canva", "invision", "framer"],
  tools: ["git", "npm", "yarn", "vscode", "eslint", "prettier", "postman"],
};

async function loadLogosJson(): Promise<LogosJsonEntry[]> {
  if (config.logosJsonPath && fs.existsSync(config.logosJsonPath)) {
    const raw = fs.readFileSync(config.logosJsonPath, "utf-8");
    return JSON.parse(raw) as LogosJsonEntry[];
  }

  const response = await fetch(getLogosJsonRemoteUrl(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`logos.json 로드 실패: ${response.status}`);
  }

  return (await response.json()) as LogosJsonEntry[];
}

function parseLogosJsonEntry(entry: LogosJsonEntry): {
  shortname: string;
  name: string;
  url: string;
  collection: LogoCollection;
  source: string | null;
  files: LogosJsonFileEntry[];
} {
  const rawFilenames = entry.files.map((file) =>
    typeof file === "string" ? file : file.filename,
  );
  const collection =
    entry.collection ?? detectCollection(rawFilenames, entry.shortname, entry.source);
  const source =
    entry.source ?? (collection === "themed" ? "thesvg" : "gilbarbara");

  return {
    shortname: entry.shortname,
    name: entry.name,
    url: entry.url ?? "",
    collection,
    source,
    files: normalizeLogosJsonFiles(entry.files, entry.shortname, collection),
  };
}

function guessCategorySlugs(shortname: string): string[] {
  const normalized = shortname.toLowerCase();
  const matched: string[] = [];

  for (const [slug, keywords] of Object.entries(categoryKeywordMap)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      matched.push(slug);
    }
  }

  return matched;
}

/** logos.json → 내장 SQLite 동기화 */
export async function syncCatalogFromSource(): Promise<{
  synced: number;
  autoTagged: number;
}> {
  const entries = await loadLogosJson();
  const database = getDatabase();

  const upsertLogo = database.prepare(`
    INSERT INTO logos (shortname, name, url, collection, source, updated_at)
    VALUES (@shortname, @name, @url, @collection, @source, datetime('now'))
    ON CONFLICT(shortname) DO UPDATE SET
      name = excluded.name,
      url = excluded.url,
      collection = excluded.collection,
      source = excluded.source,
      updated_at = datetime('now')
  `);

  const deleteFiles = database.prepare(
    "DELETE FROM logo_files WHERE shortname = ?",
  );
  const insertFile = database.prepare(`
    INSERT OR REPLACE INTO logo_files (shortname, filename, variant)
    VALUES (?, ?, ?)
  `);

  const categoryRows = database
    .prepare("SELECT id, slug FROM categories")
    .all() as { id: number; slug: string }[];

  const insertLogoCategory = database.prepare(`
    INSERT OR IGNORE INTO logo_categories (logo_shortname, category_id)
    VALUES (?, ?)
  `);

  let autoTagged = 0;

  const syncTransaction = database.transaction((rows: LogosJsonEntry[]) => {
    for (const entry of rows) {
      const parsed = parseLogosJsonEntry(entry);

      upsertLogo.run({
        shortname: parsed.shortname,
        name: parsed.name,
        url: parsed.url,
        collection: parsed.collection,
        source: parsed.source,
      });

      deleteFiles.run(parsed.shortname);
      for (const file of parsed.files) {
        insertFile.run(parsed.shortname, file.filename, file.variant);
      }

      const guessed = guessCategorySlugs(parsed.shortname);
      const hasCategory = database
        .prepare(
          "SELECT COUNT(*) as count FROM logo_categories WHERE logo_shortname = ?",
        )
        .get(parsed.shortname) as { count: number };

      if (hasCategory.count === 0 && guessed.length > 0) {
        for (const slug of guessed) {
          const category = categoryRows.find((row) => row.slug === slug);
          if (category) {
            insertLogoCategory.run(parsed.shortname, category.id);
            autoTagged += 1;
          }
        }
      }
    }
  });

  syncTransaction(entries);

  return { synced: entries.length, autoTagged };
}

function mapLogoRow(
  row: {
    shortname: string;
    name: string;
    url: string | null;
    collection: LogoCollection;
    source: string | null;
  },
  database: ReturnType<typeof getDatabase>,
): LogoEntry {
  const files = database
    .prepare(
      "SELECT filename, variant FROM logo_files WHERE shortname = ? ORDER BY filename",
    )
    .all(row.shortname) as { filename: string; variant: string }[];

  const categories = database
    .prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.sort_order as sortOrder
       FROM categories c
       INNER JOIN logo_categories lc ON lc.category_id = c.id
       WHERE lc.logo_shortname = ?
       ORDER BY c.sort_order`,
    )
    .all(row.shortname) as Category[];

  const tags = database
    .prepare(
      `SELECT t.id, t.name, t.slug
       FROM tags t
       INNER JOIN logo_tags lt ON lt.tag_id = t.id
       WHERE lt.logo_shortname = ?
       ORDER BY t.name`,
    )
    .all(row.shortname) as Tag[];

  return {
    shortname: row.shortname,
    name: row.name,
    url: row.url,
    collection: row.collection,
    source: row.source,
    files: enrichLogoFiles(row.shortname, files, row.collection),
    categories,
    tags,
  };
}

export function listLogos(params: {
  query?: string;
  categorySlug?: string;
  tagSlug?: string;
  collection?: LogoCollection;
  page?: number;
  pageSize?: number;
  sort?: "name" | "recent";
}): LogoListResult {
  const database = getDatabase();
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 48, 100);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["1=1"];
  const bindings: (string | number)[] = [];

  if (params.collection) {
    conditions.push("l.collection = ?");
    bindings.push(params.collection);
  }

  if (params.query) {
    conditions.push("(l.name LIKE ? OR l.shortname LIKE ?)");
    const pattern = `%${params.query}%`;
    bindings.push(pattern, pattern);
  }

  if (params.categorySlug) {
    conditions.push(`EXISTS (
      SELECT 1 FROM logo_categories lc
      INNER JOIN categories c ON c.id = lc.category_id
      WHERE lc.logo_shortname = l.shortname AND c.slug = ?
    )`);
    bindings.push(params.categorySlug);
  }

  if (params.tagSlug) {
    conditions.push(`EXISTS (
      SELECT 1 FROM logo_tags lt
      INNER JOIN tags t ON t.id = lt.tag_id
      WHERE lt.logo_shortname = l.shortname AND t.slug = ?
    )`);
    bindings.push(params.tagSlug);
  }

  const whereClause = conditions.join(" AND ");
  const orderBy =
    params.sort === "recent" ? "l.updated_at DESC" : "l.name COLLATE NOCASE ASC";

  const totalRow = database
    .prepare(
      `SELECT COUNT(DISTINCT l.shortname) as total FROM logos l WHERE ${whereClause}`,
    )
    .get(...bindings) as { total: number };

  const rows = database
    .prepare(
      `SELECT DISTINCT l.shortname, l.name, l.url, l.collection, l.source
       FROM logos l
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    )
    .all(...bindings, pageSize, offset) as {
    shortname: string;
    name: string;
    url: string | null;
    collection: LogoCollection;
    source: string | null;
  }[];

  return {
    items: rows.map((row) => mapLogoRow(row, database)),
    total: totalRow.total,
    page,
    pageSize,
  };
}

export function getLogoByShortname(shortname: string): LogoEntry | null {
  const database = getDatabase();
  const row = database
    .prepare(
      "SELECT shortname, name, url, collection, source FROM logos WHERE shortname = ?",
    )
    .get(shortname) as
    | {
        shortname: string;
        name: string;
        url: string | null;
        collection: LogoCollection;
        source: string | null;
      }
    | undefined;

  if (!row) return null;
  return mapLogoRow(row, database);
}

export function listCategories(): Category[] {
  const database = getDatabase();
  return database
    .prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.sort_order as sortOrder,
              COUNT(lc.logo_shortname) as logoCount
       FROM categories c
       LEFT JOIN logo_categories lc ON lc.category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`,
    )
    .all() as Category[];
}

export function listTags(): Tag[] {
  const database = getDatabase();
  return database
    .prepare(
      `SELECT t.id, t.name, t.slug,
              COUNT(lt.logo_shortname) as logoCount
       FROM tags t
       LEFT JOIN logo_tags lt ON lt.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name`,
    )
    .all() as Tag[];
}

export function createCategory(input: {
  name: string;
  description?: string;
}): Category {
  const database = getDatabase();
  const slug = slugify(input.name);
  const result = database
    .prepare(
      `INSERT INTO categories (name, slug, description)
       VALUES (?, ?, ?)`,
    )
    .run(input.name, slug, input.description ?? null);

  return database
    .prepare(
      "SELECT id, name, slug, description, sort_order as sortOrder FROM categories WHERE id = ?",
    )
    .get(result.lastInsertRowid) as Category;
}

export function createTag(name: string): Tag {
  const database = getDatabase();
  const slug = slugify(name.replace(/^#/, ""));
  const displayName = name.startsWith("#") ? name : `#${name}`;

  const result = database
    .prepare("INSERT INTO tags (name, slug) VALUES (?, ?)")
    .run(displayName, slug);

  return database
    .prepare("SELECT id, name, slug FROM tags WHERE id = ?")
    .get(result.lastInsertRowid) as Tag;
}

export function deleteCategory(id: number): void {
  const database = getDatabase();
  database.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

export function deleteTag(id: number): void {
  const database = getDatabase();
  database.prepare("DELETE FROM tags WHERE id = ?").run(id);
}

export function updateLogoMetadata(
  shortname: string,
  categoryIds: number[],
  tagIds: number[],
): void {
  const database = getDatabase();

  const updateTransaction = database.transaction(() => {
    database
      .prepare("DELETE FROM logo_categories WHERE logo_shortname = ?")
      .run(shortname);
    database.prepare("DELETE FROM logo_tags WHERE logo_shortname = ?").run(shortname);

    const insertCategory = database.prepare(
      "INSERT INTO logo_categories (logo_shortname, category_id) VALUES (?, ?)",
    );
    const insertTag = database.prepare(
      "INSERT INTO logo_tags (logo_shortname, tag_id) VALUES (?, ?)",
    );

    for (const categoryId of categoryIds) {
      insertCategory.run(shortname, categoryId);
    }
    for (const tagId of tagIds) {
      insertTag.run(shortname, tagId);
    }
  });

  updateTransaction();
}

/** 로고 기본 정보 SQLite 업데이트 */
export function updateLogoEntry(
  shortname: string,
  input: { name: string; url: string; collection?: LogoCollection; source?: string },
): void {
  const database = getDatabase();

  if (input.collection !== undefined) {
    database
      .prepare(
        `UPDATE logos
         SET name = ?, url = ?, collection = ?, source = ?, updated_at = datetime('now')
         WHERE shortname = ?`,
      )
      .run(
        input.name,
        input.url || null,
        input.collection,
        input.source ?? null,
        shortname,
      );
    return;
  }

  database
    .prepare(
      `UPDATE logos
       SET name = ?, url = ?, updated_at = datetime('now')
       WHERE shortname = ?`,
    )
    .run(input.name, input.url || null, shortname);
}

export function upsertLogoLocally(entry: LogosJsonEntry): void {
  const database = getDatabase();
  const parsed = parseLogosJsonEntry(entry);

  database
    .prepare(
      `INSERT INTO logos (shortname, name, url, collection, source, updated_at)
       VALUES (@shortname, @name, @url, @collection, @source, datetime('now'))
       ON CONFLICT(shortname) DO UPDATE SET
         name = excluded.name,
         url = excluded.url,
         collection = excluded.collection,
         source = excluded.source,
         updated_at = datetime('now')`,
    )
    .run(parsed);

  for (const file of parsed.files) {
    database
      .prepare(
        `INSERT OR REPLACE INTO logo_files (shortname, filename, variant)
         VALUES (?, ?, ?)`,
      )
      .run(parsed.shortname, file.filename, file.variant);
  }
}

export function getCollectionCounts(): Record<LogoCollection, number> {
  const database = getDatabase();
  const rows = database
    .prepare(
      `SELECT collection, COUNT(*) as count FROM logos GROUP BY collection`,
    )
    .all() as { collection: LogoCollection; count: number }[];

  return {
    simple: rows.find((row) => row.collection === "simple")?.count ?? 0,
    themed: rows.find((row) => row.collection === "themed")?.count ?? 0,
  };
}
