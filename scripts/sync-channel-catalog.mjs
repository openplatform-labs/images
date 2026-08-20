#!/usr/bin/env node
/**
 * 채널 카탈로그 JSON → SQLite 동기화
 * 사용: node scripts/sync-channel-catalog.mjs icons
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const projectRoot = path.resolve(import.meta.dirname, "..");
const channelCatalogFiles = {
  logos: "logos.json",
  images: "images.json",
  illust: "illust.json",
  icons: "icons.json",
  avatars: "avatars.json",
  pictograms: "pictograms.json",
};

const channelId = process.argv[2] ?? "logos";
const catalogFile = channelCatalogFiles[channelId];
if (!catalogFile) {
  console.error(`알 수 없는 채널: ${channelId}`);
  process.exit(1);
}

const catalogPath = path.join(projectRoot, catalogFile);
const databasePath = path.join(projectRoot, "data", "catalog.sqlite");

if (!fs.existsSync(catalogPath)) {
  console.error(`카탈로그 없음: ${catalogPath}`);
  process.exit(1);
}

function inferVariant(filename, shortname) {
  const lower = filename.toLowerCase();
  const baseName = `${shortname}.svg`;
  if (lower === baseName || lower.endsWith(`/${baseName}`)) return "default";
  if (lower.endsWith("-icon.svg")) return "icon";
  return "default";
}

const entries = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

const upsertLogo = database.prepare(`
  INSERT INTO logos (channel, shortname, name, url, collection, source, updated_at)
  VALUES (@channel, @shortname, @name, @url, @collection, @source, datetime('now'))
  ON CONFLICT(channel, shortname) DO UPDATE SET
    name = excluded.name,
    url = excluded.url,
    collection = excluded.collection,
    source = excluded.source,
    updated_at = datetime('now')
`);

const deleteFiles = database.prepare(
  "DELETE FROM logo_files WHERE channel = ? AND shortname = ?",
);
const insertFile = database.prepare(`
  INSERT OR REPLACE INTO logo_files (channel, shortname, filename, variant, width, height, bytes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const syncTransaction = database.transaction((rows) => {
  const keepShortnames = new Set(rows.map((entry) => entry.shortname));
  for (const entry of rows) {
    const rawFiles = (entry.files ?? []).map((file) =>
      typeof file === "string" ? file : file.filename,
    );
    upsertLogo.run({
      channel: channelId,
      shortname: entry.shortname,
      name: entry.name,
      url: entry.url ?? "",
      collection: entry.collection ?? "simple",
      source: entry.source ?? null,
    });
    deleteFiles.run(channelId, entry.shortname);
    for (const filename of rawFiles) {
      insertFile.run(
        channelId,
        entry.shortname,
        filename,
        inferVariant(filename, entry.shortname),
        null,
        null,
        null,
      );
    }
  }

  const existing = database
    .prepare("SELECT shortname FROM logos WHERE channel = ?")
    .all(channelId);
  const deleteLogo = database.prepare(
    "DELETE FROM logos WHERE channel = ? AND shortname = ?",
  );
  for (const row of existing) {
    if (!keepShortnames.has(row.shortname)) {
      deleteFiles.run(channelId, row.shortname);
      deleteLogo.run(channelId, row.shortname);
    }
  }
});

syncTransaction(entries);
database.close();
console.log(`${channelId} 동기화 완료: ${entries.length}개`);
