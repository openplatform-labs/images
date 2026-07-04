#!/usr/bin/env node
/**
 * logos.json → SQLite catalog 동기화 (CLI)
 * 사용: node scripts/sync-catalog.mjs
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const projectRoot = path.resolve(import.meta.dirname, "..");
const logosJsonPath = path.join(projectRoot, "logos.json");
const databasePath = path.join(projectRoot, "data", "catalog.sqlite");

const themedFilenamePattern =
  /-(light|dark|color|wordmark|wordmarklight|wordmarkdark|mono|16|32|64|line|horizontal|lockup|octocat)\.svg$/i;

function inferVariant(filename, shortname, collection) {
  const lower = filename.toLowerCase();
  const base = `${shortname}.svg`;

  if (collection === "simple") {
    if (lower === base) return "default";
    if (lower.endsWith("-icon.svg")) return "icon";
    return "default";
  }

  if (lower === base) return "default";
  if (lower.endsWith("-color.svg")) return "color";
  if (lower.endsWith("-light.svg")) return "light";
  if (lower.endsWith("-dark.svg")) return "dark";
  if (lower.endsWith("-wordmarklight.svg")) return "wordmarkLight";
  if (lower.endsWith("-wordmarkdark.svg")) return "wordmarkDark";
  if (lower.endsWith("-wordmark.svg")) return "wordmark";
  if (lower.endsWith("-icon.svg") || lower.endsWith("-mono.svg")) return "mono";
  if (lower.endsWith("-line.svg")) return "line";
  return "default";
}

function detectCollection(filenames, shortname, source) {
  if (source === "thesvg") return "themed";
  if (source === "gilbarbara") return "simple";

  const hasThemedFile = filenames.some(
    (filename) =>
      themedFilenamePattern.test(filename) ||
      (filename !== `${shortname}.svg` &&
        !filename.endsWith("-icon.svg") &&
        filename.startsWith(`${shortname}-`)),
  );

  return hasThemedFile ? "themed" : "simple";
}

function parseEntry(entry) {
  const rawFilenames = entry.files.map((file) =>
    typeof file === "string" ? file : file.filename,
  );
  const collection =
    entry.collection ?? detectCollection(rawFilenames, entry.shortname, entry.source);
  const source =
    entry.source ?? (collection === "themed" ? "thesvg" : "gilbarbara");

  const files = entry.files.map((file) => {
    if (typeof file === "string") {
      return {
        filename: file,
        variant: inferVariant(file, entry.shortname, collection),
      };
    }
    return {
      filename: file.filename,
      variant: file.variant ?? inferVariant(file.filename, entry.shortname, collection),
    };
  });

  return {
    shortname: entry.shortname,
    name: entry.name,
    url: entry.url ?? "",
    collection,
    source,
    files,
  };
}

function main() {
  const entries = JSON.parse(fs.readFileSync(logosJsonPath, "utf-8"));
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

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

  const deleteFiles = database.prepare("DELETE FROM logo_files WHERE shortname = ?");
  const insertFile = database.prepare(`
    INSERT OR REPLACE INTO logo_files (shortname, filename, variant)
    VALUES (?, ?, ?)
  `);

  const syncTransaction = database.transaction((rows) => {
    for (const entry of rows) {
      const parsed = parseEntry(entry);
      upsertLogo.run(parsed);
      deleteFiles.run(parsed.shortname);
      for (const file of parsed.files) {
        insertFile.run(parsed.shortname, file.filename, file.variant);
      }
    }
  });

  syncTransaction(entries);
  database.close();

  console.log(`catalog 동기화 완료: ${entries.length}개`);
}

main();
