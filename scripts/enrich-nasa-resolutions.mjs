#!/usr/bin/env node
/**
 * 기존 images.json 항목에 NASA thumb/small/medium/large/orig 해상도 추가
 * 사용: node scripts/enrich-nasa-resolutions.mjs
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const projectRoot = path.resolve(import.meta.dirname, "..");
const imagesDir = path.join(projectRoot, "images");
const imagesJsonPath = path.join(projectRoot, "images.json");
const databasePath = path.join(projectRoot, "data", "catalog.sqlite");
const apiRoot = "https://images-api.nasa.gov";

const RESOLUTIONS = ["orig", "large", "medium", "small", "thumb"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nasaIdFromEntry(entry) {
  try {
    const pathname = new URL(entry.url).pathname;
    const part = pathname.split("/").filter(Boolean).pop();
    return part || null;
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

async function resolveAssetVariants(nasaId) {
  const payload = await fetchJson(
    `${apiRoot}/asset/${encodeURIComponent(nasaId)}`,
  );
  const hrefs = (payload.collection?.items ?? [])
    .map((item) => item.href)
    .filter(Boolean)
    .map((href) => href.replace(/^http:/, "https:"));

  const byResolution = {};
  for (const resolution of RESOLUTIONS) {
    const match = hrefs.find(
      (href) =>
        href.includes(`~${resolution}.`) &&
        /\.(jpe?g|png|webp)$/i.test(href),
    );
    if (match) byResolution[resolution] = match;
  }
  return byResolution;
}

async function probeImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`다운로드 실패 ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  let width = null;
  let height = null;

  // JPEG SOF0/SOF2에서 대략 크기 추출
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        break;
      }
      offset += 2 + size;
    }
  }

  return { buffer, bytes: buffer.length, width, height, contentType };
}

function syncCatalog(entries) {
  if (!fs.existsSync(databasePath)) return;
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");

  const fileColumns = database
    .prepare("PRAGMA table_info(logo_files)")
    .all()
    .map((column) => column.name);
  for (const column of ["width", "height", "bytes"]) {
    if (!fileColumns.includes(column)) {
      database.exec(`ALTER TABLE logo_files ADD COLUMN ${column} INTEGER`);
    }
  }

  const upsert = database.prepare(`
    INSERT INTO logos (channel, shortname, name, url, collection, source, updated_at)
    VALUES ('images', @shortname, @name, @url, @collection, @source, datetime('now'))
    ON CONFLICT(channel, shortname) DO UPDATE SET
      name = excluded.name,
      url = excluded.url,
      collection = excluded.collection,
      source = excluded.source,
      updated_at = datetime('now')
  `);
  const deleteFiles = database.prepare(
    "DELETE FROM logo_files WHERE channel = 'images' AND shortname = ?",
  );
  const insertFile = database.prepare(`
    INSERT OR REPLACE INTO logo_files (channel, shortname, filename, variant, width, height, bytes)
    VALUES ('images', ?, ?, ?, ?, ?, ?)
  `);

  const sync = database.transaction((rows) => {
    for (const entry of rows) {
      upsert.run({
        shortname: entry.shortname,
        name: entry.name,
        url: entry.url ?? "",
        collection: entry.collection ?? "simple",
        source: entry.source ?? "nasa",
      });
      deleteFiles.run(entry.shortname);
      for (const file of entry.files) {
        insertFile.run(
          entry.shortname,
          file.filename,
          file.variant ?? "medium",
          file.width ?? null,
          file.height ?? null,
          file.bytes ?? null,
        );
      }
    }
  });

  sync(entries);
  database.close();
}

async function main() {
  fs.mkdirSync(imagesDir, { recursive: true });
  const entries = JSON.parse(fs.readFileSync(imagesJsonPath, "utf-8"));
  console.log(`해상도 보강 시작: ${entries.length}개`);

  // 구형 shortname.jpg 정리용
  const obsoleteFiles = new Set();

  for (const [index, entry] of entries.entries()) {
    const nasaId = nasaIdFromEntry(entry);
    process.stdout.write(
      `[${index + 1}/${entries.length}] ${entry.shortname} (${nasaId ?? "?"}) ... `,
    );

    if (!nasaId) {
      console.log("스킵 (nasa_id 없음)");
      continue;
    }

    try {
      const variants = await resolveAssetVariants(nasaId);
      const files = [];

      for (const resolution of RESOLUTIONS) {
        const sourceUrl = variants[resolution];
        if (!sourceUrl) continue;

        const extensionMatch = sourceUrl.match(/\.(jpe?g|png|webp)(?:\?|$)/i);
        const extension = (extensionMatch?.[1] ?? "jpg")
          .toLowerCase()
          .replace("jpeg", "jpg");
        const filename = `${entry.shortname}-${resolution}.${extension}`;
        const destination = path.join(imagesDir, filename);

        let meta;
        if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
          const buffer = fs.readFileSync(destination);
          meta = {
            buffer,
            bytes: buffer.length,
            width: null,
            height: null,
          };
          // 기존 파일이면 크기만 재측정
          if (buffer[0] === 0xff && buffer[1] === 0xd8) {
            let offset = 2;
            while (offset < buffer.length) {
              if (buffer[offset] !== 0xff) break;
              const marker = buffer[offset + 1];
              const size = buffer.readUInt16BE(offset + 2);
              if (marker >= 0xc0 && marker <= 0xc3) {
                meta.height = buffer.readUInt16BE(offset + 5);
                meta.width = buffer.readUInt16BE(offset + 7);
                break;
              }
              offset += 2 + size;
            }
          }
        } else {
          meta = await probeImage(sourceUrl);
          if (meta.bytes > MAX_FILE_BYTES) {
            console.log(
              `(skip ${resolution} ${(meta.bytes / 1024 / 1024).toFixed(1)}MB)`,
            );
            continue;
          }
          fs.writeFileSync(destination, meta.buffer);
          await sleep(150);
        }

        if (meta.bytes > MAX_FILE_BYTES) {
          if (fs.existsSync(destination)) fs.unlinkSync(destination);
          continue;
        }

        files.push({
          filename,
          variant: resolution,
          width: meta.width ?? undefined,
          height: meta.height ?? undefined,
          bytes: meta.bytes,
        });
      }

      if (files.length === 0) {
        console.log("스킵 (해상도 URL 없음)");
        continue;
      }

      // 구형 단일 파일 제거 대상
      for (const old of entry.files ?? []) {
        const oldName = typeof old === "string" ? old : old.filename;
        if (
          oldName &&
          !oldName.includes("-") &&
          oldName.startsWith(entry.shortname)
        ) {
          obsoleteFiles.add(oldName);
        }
        if (/-(thumb|small|medium|large|orig)\./.test(oldName) === false) {
          if (oldName === `${entry.shortname}.jpg`) obsoleteFiles.add(oldName);
        }
      }

      entry.files = files;
      console.log(files.map((file) => file.variant).join(","));
      await sleep(200);
    } catch (error) {
      console.log(`실패: ${error.message}`);
    }
  }

  for (const obsolete of obsoleteFiles) {
    const target = path.join(imagesDir, obsolete);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }

  fs.writeFileSync(imagesJsonPath, JSON.stringify(entries, null, 2) + "\n");
  syncCatalog(entries);

  const fileCount = fs
    .readdirSync(imagesDir)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).length;
  console.log(`완료: images.json ${entries.length}건, 파일 ${fileCount}개`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
