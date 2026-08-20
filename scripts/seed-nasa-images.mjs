#!/usr/bin/env node
/**
 * NASA Image Library → images/ + images.json 시드
 * 우주 천체·탐사 이미지만 수집 (우주비행사·인물 제외)
 *
 * 사용: node scripts/seed-nasa-images.mjs [--limit=48] [--dry-run]
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const projectRoot = path.resolve(import.meta.dirname, "..");
const imagesDir = path.join(projectRoot, "images");
const imagesJsonPath = path.join(projectRoot, "images.json");
const databasePath = path.join(projectRoot, "data", "catalog.sqlite");
const apiRoot = "https://images-api.nasa.gov";

const limitArgument = process.argv.find((argument) =>
  argument.startsWith("--limit="),
);
const targetLimit = Number(limitArgument?.split("=")[1] ?? 48);
const dryRun = process.argv.includes("--dry-run");

/** 천체·우주 객체 중심 검색어 */
const SEARCH_QUERIES = [
  { q: "hubble nebula", category: "nebulae" },
  { q: "crab nebula hubble", category: "nebulae" },
  { q: "orion nebula hubble", category: "nebulae" },
  { q: "eagle nebula pillars", category: "nebulae" },
  { q: "carina nebula", category: "nebulae" },
  { q: "andromeda galaxy hubble", category: "galaxies" },
  { q: "hubble deep field", category: "galaxies" },
  { q: "whirlpool galaxy", category: "galaxies" },
  { q: "sombrero galaxy", category: "galaxies" },
  { q: "james webb cartwheel", category: "galaxies" },
  { q: "mars curiosity landscape", category: "planets" },
  { q: "mars perseverance rock", category: "planets" },
  { q: "jupiter great red spot", category: "planets" },
  { q: "saturn rings cassini", category: "planets" },
  { q: "neptune voyager", category: "planets" },
  { q: "uranus voyager", category: "planets" },
  { q: "pluto new horizons", category: "planets" },
  { q: "europa surface", category: "planets" },
  { q: "enceladus geyser", category: "planets" },
  { q: "earth blue marble", category: "earth" },
  { q: "earth from apollo", category: "earth" },
  { q: "solar flare sdo", category: "stars" },
  { q: "supernova remnant", category: "stars" },
  { q: "black hole event horizon", category: "galaxies" },
  { q: "halley comet", category: "missions" },
  { q: "asteroid bennu osiris", category: "missions" },
  { q: "voyager golden record space", category: "missions" },
  { q: "parker solar probe", category: "missions" },
];

function scoreCandidate(haystack, title) {
  let score = 0;
  const strong = [
    /nebula/i,
    /galaxy/i,
    /mars/i,
    /jupiter/i,
    /saturn/i,
    /neptune/i,
    /uranus/i,
    /pluto/i,
    /moon/i,
    /earth/i,
    /solar flare/i,
    /supernova/i,
    /comet/i,
    /asteroid/i,
    /black hole/i,
  ];
  for (const pattern of strong) {
    if (pattern.test(title)) score += 5;
    else if (pattern.test(haystack)) score += 2;
  }
  if (/hubble|webb|cassini|voyager|galileo|spitzer|chandra/i.test(haystack)) {
    score += 1;
  }
  if (/rollout|prelaunch|ariane|cleanroom|assembly|hangar/i.test(haystack)) {
    score -= 20;
  }
  return score;
}

/** 우주비행사·인물·초상 제외 */
const EXCLUDE_PATTERNS = [
  /\bastronaut\b/i,
  /\bcosmonaut\b/i,
  /\bcrew(?:members?)?\b/i,
  /\bconcept art\b/i,
  /\bmuseum\b/i,
  /\banniversary\b/i,
  /\bhistory of hubble\b/i,
  /\bmementos\b/i,
  /\bportrait\b/i,
  /\bspacesuit\b/i,
  /\bspace suit\b/i,
  /\beva\b/i,
  /\bextravehicular\b/i,
  /\bspacewalk\b/i,
  /\bflight director\b/i,
  /\bmission control\b.*\bpeople\b/i,
  /\bengineer\b/i,
  /\bscientist\b.*\bposes\b/i,
  /\bposes (for|beside|next)\b/i,
  /\bgroup photo\b/i,
  /\bpress conference\b/i,
  /\bhandshake\b/i,
  /\bgraduation\b/i,
  /\binsignia\b/i,
  /\bnasa logo\b/i,
  /\bnasa seal\b/i,
  /\bmission patch\b/i,
  /\bcrew patch\b/i,
  /\bdiagram\b/i,
  /\bschematic\b/i,
  /\bchart\b/i,
  /\binfographic\b/i,
  /\brollout\b/i,
  /\bprelaunch\b/i,
  /\bpre-launch\b/i,
  /\blaunch pad\b/i,
  /\bcleanroom\b/i,
  /\bclean room\b/i,
  /\bfactory\b/i,
  /\bassembly building\b/i,
  /\bhangar\b/i,
  /\btransporter\b/i,
  /\bpayload fairing\b/i,
  /\bariane\b/i,
  /\bcape canaveral\b/i,
  /\bkennedy space center\b/i,
  /\bpress site\b/i,
  /\bteam photo\b/i,
  /\bresearchers?\b/i,
  /\bscientist\b/i,
  /\bexamines?\b/i,
  /\blaboratory\b/i,
  /\bclean room\b/i,
  /\bvial\b/i,
  /\bsample of\b/i,
  /\banimation\b/i,
  /\banimated\b/i,
  /\bstill from\b/i,
  /\bpress conference\b/i,
  /\bholding\b/i,
  /\bwearing\b/i,
];

const SPACE_REQUIRE_PATTERNS = [
  /\bnebula\b/i,
  /\bgalaxy\b/i,
  /\bgalaxies\b/i,
  /\bmars\b/i,
  /\bjupiter\b/i,
  /\bsaturn\b/i,
  /\bneptune\b/i,
  /\buranus\b/i,
  /\bvenus\b/i,
  /\bmercury\b/i,
  /\bpluto\b/i,
  /\bmoon\b/i,
  /\blunar\b/i,
  /\bearth\b/i,
  /\bsun\b/i,
  /\bsolar\b/i,
  /\bstar\b/i,
  /\bsupernova\b/i,
  /\bcomet\b/i,
  /\basteroid\b/i,
  /\bblack hole\b/i,
  /\bplanet\b/i,
  /\bsatellite\b/i,
  /\bhubble\b/i,
  /\bwebb\b/i,
  /\bspitzer\b/i,
  /\bcassini\b/i,
  /\bvoyager\b/i,
  /\bgalileo\b/i,
  /\bcuriosity\b/i,
  /\bperseverance\b/i,
  /\borbit\b/i,
  /\bcosmos\b/i,
  /\bcosmic\b/i,
  /\binterstellar\b/i,
  /\beuclid\b/i,
  /\bchandra\b/i,
];

const CATEGORY_DEFS = [
  { name: "Planets", slug: "planets", description: "행성 · 위성", sortOrder: 1 },
  { name: "Nebulae", slug: "nebulae", description: "성운", sortOrder: 2 },
  { name: "Galaxies", slug: "galaxies", description: "은하", sortOrder: 3 },
  { name: "Stars", slug: "stars", description: "항성 · 초신성", sortOrder: 4 },
  { name: "Earth", slug: "earth", description: "지구 · 궤도 뷰", sortOrder: 5 },
  {
    name: "Missions",
    slug: "missions",
    description: "우주선 · 망원경 · 탐사",
    sortOrder: 6,
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugifyNasaId(nasaId) {
  return nasaId
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildHaystack(itemData) {
  const keywords = Array.isArray(itemData.keywords)
    ? itemData.keywords.join(" ")
    : "";
  return [
    itemData.title,
    itemData.description,
    itemData.description_508,
    keywords,
  ]
    .filter(Boolean)
    .join(" \n ");
}

function isAstronautOrPersonContent(haystack) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(haystack));
}

function isSpaceSubject(haystack) {
  return SPACE_REQUIRE_PATTERNS.some((pattern) => pattern.test(haystack));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return response.json();
}

async function searchNasa(query, pageSize = 20) {
  const params = new URLSearchParams({
    q: query,
    media_type: "image",
    page_size: String(pageSize),
    page: "1",
  });
  const payload = await fetchJson(`${apiRoot}/search?${params.toString()}`);
  return payload.collection?.items ?? [];
}

function pickDownloadUrl(links) {
  if (!Array.isArray(links) || links.length === 0) return null;

  const byPreference = ["medium", "large", "small", "orig", "thumb"];
  for (const preference of byPreference) {
    const match = links.find((link) =>
      String(link.href ?? "").includes(`~${preference}.`),
    );
    if (match?.href) return match.href.replace(/^http:/, "https:");
  }

  const imageLink = links.find((link) => link.render === "image" && link.href);
  return imageLink?.href?.replace(/^http:/, "https:") ?? null;
}

async function resolveAssetUrl(nasaId) {
  const payload = await fetchJson(
    `${apiRoot}/asset/${encodeURIComponent(nasaId)}`,
  );
  const hrefs = (payload.collection?.items ?? [])
    .map((item) => item.href)
    .filter(Boolean)
    .map((href) => href.replace(/^http:/, "https:"));

  const byPreference = ["medium", "large", "small", "orig"];
  for (const preference of byPreference) {
    const match = hrefs.find((href) => href.includes(`~${preference}.`));
    if (match && /\.(jpe?g|png|webp)$/i.test(match)) return match;
  }

  return hrefs.find((href) => /\.(jpe?g|png|webp)$/i.test(href)) ?? null;
}

async function downloadFile(url, destinationPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`다운로드 실패 ${response.status}: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destinationPath, buffer);
  return buffer.length;
}

function ensureSpaceCategories(database) {
  // 기존 웹/UI용 카테고리 제거 후 우주 분류로 교체
  database
    .prepare("DELETE FROM categories WHERE channel = 'images'")
    .run();

  const insert = database.prepare(`
    INSERT INTO categories (name, slug, description, sort_order, channel)
    VALUES (@name, @slug, @description, @sortOrder, 'images')
  `);

  for (const category of CATEGORY_DEFS) {
    insert.run(category);
  }
}

function syncImagesCatalog(entries, categoryByShortname) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  ensureSpaceCategories(database);

  // images 채널 기존 항목 전체 교체
  database.prepare("DELETE FROM logo_files WHERE channel = 'images'").run();
  database
    .prepare(
      `DELETE FROM logo_categories
       WHERE logo_shortname IN (SELECT shortname FROM logos WHERE channel = 'images')`,
    )
    .run();
  database.prepare("DELETE FROM logos WHERE channel = 'images'").run();

  const categories = database
    .prepare("SELECT id, slug FROM categories WHERE channel = 'images'")
    .all();
  const categoryIdBySlug = Object.fromEntries(
    categories.map((row) => [row.slug, row.id]),
  );

  const upsertLogo = database.prepare(`
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
    INSERT OR REPLACE INTO logo_files (channel, shortname, filename, variant)
    VALUES ('images', ?, ?, ?)
  `);
  const deleteLogoCategories = database.prepare(
    "DELETE FROM logo_categories WHERE logo_shortname = ?",
  );
  const insertLogoCategory = database.prepare(
    "INSERT OR IGNORE INTO logo_categories (logo_shortname, category_id) VALUES (?, ?)",
  );

  const syncTransaction = database.transaction((rows) => {
    for (const entry of rows) {
      upsertLogo.run({
        shortname: entry.shortname,
        name: entry.name,
        url: entry.url ?? "",
        collection: entry.collection ?? "simple",
        source: entry.source ?? "nasa",
      });

      deleteFiles.run(entry.shortname);
      for (const file of entry.files) {
        const filename = typeof file === "string" ? file : file.filename;
        const variant =
          typeof file === "string" ? "default" : (file.variant ?? "default");
        insertFile.run(entry.shortname, filename, variant);
      }

      deleteLogoCategories.run(entry.shortname);
      const categorySlug = categoryByShortname[entry.shortname];
      const categoryId = categoryIdBySlug[categorySlug];
      if (categoryId) {
        insertLogoCategory.run(entry.shortname, categoryId);
      }
    }
  });

  syncTransaction(entries);
  database.close();
}

async function main() {
  console.log(
    `NASA 우주 이미지 시드 시작 (목표 ${targetLimit}장${dryRun ? ", dry-run" : ""})`,
  );

  fs.mkdirSync(imagesDir, { recursive: true });

  // 재시드: 기존 nasa 산출물 초기화
  if (!dryRun) {
    for (const filename of fs.readdirSync(imagesDir)) {
      if (filename === ".gitkeep") continue;
      fs.unlinkSync(path.join(imagesDir, filename));
    }
    fs.writeFileSync(imagesJsonPath, "[]\n");
  }

  const existingEntries = [];
  const existingShortnames = new Set();

  const candidates = [];
  const seenNasaIds = new Set();

  for (const search of SEARCH_QUERIES) {
    process.stdout.write(`검색: ${search.q} ... `);
    let items = [];
    try {
      items = await searchNasa(search.q, 25);
      console.log(`${items.length}건`);
    } catch (error) {
      console.log(`실패 (${error.message})`);
      continue;
    }

    for (const item of items) {
      const itemData = item.data?.[0];
      if (!itemData || itemData.media_type !== "image") continue;

      const nasaId = itemData.nasa_id;
      if (!nasaId || seenNasaIds.has(nasaId)) continue;

      const haystack = buildHaystack(itemData);
      if (isAstronautOrPersonContent(haystack)) continue;
      if (!isSpaceSubject(haystack)) continue;

      const shortname = slugifyNasaId(nasaId);
      if (!shortname || existingShortnames.has(shortname)) continue;

      const previewUrl = pickDownloadUrl(item.links);
      const score = scoreCandidate(haystack, itemData.title ?? "");
      if (score < 3) continue;

      candidates.push({
        nasaId,
        shortname,
        name: itemData.title?.trim() || nasaId,
        description: itemData.description ?? "",
        keywords: itemData.keywords ?? [],
        credit: itemData.secondary_creator || itemData.center || "NASA",
        category: search.category,
        previewUrl,
        photojournalUrl: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
        score,
      });
      seenNasaIds.add(nasaId);
    }

    await sleep(250);
  }

  candidates.sort((left, right) => right.score - left.score);

  // 카테고리별 상한으로 다양성 확보
  const perCategoryLimit = Math.max(4, Math.ceil(targetLimit / 6));
  const selectedBalanced = [];
  const categoryCounts = {};
  for (const candidate of candidates) {
    const count = categoryCounts[candidate.category] ?? 0;
    if (count >= perCategoryLimit) continue;
    selectedBalanced.push(candidate);
    categoryCounts[candidate.category] = count + 1;
    if (selectedBalanced.length >= targetLimit) break;
  }

  // 부족하면 점수순으로 채움
  if (selectedBalanced.length < targetLimit) {
    const selectedIds = new Set(selectedBalanced.map((item) => item.nasaId));
    for (const candidate of candidates) {
      if (selectedIds.has(candidate.nasaId)) continue;
      selectedBalanced.push(candidate);
      if (selectedBalanced.length >= targetLimit) break;
    }
  }

  console.log(
    `후보 ${candidates.length}건 → 균형 선별 ${selectedBalanced.length}건`,
    categoryCounts,
  );

  const selected = selectedBalanced;
  const newEntries = [];
  const categoryByShortname = {};

  for (const [index, candidate] of selected.entries()) {
    process.stdout.write(
      `[${index + 1}/${selected.length}] ${candidate.shortname} ... `,
    );

    try {
      let downloadUrl = candidate.previewUrl;
      if (!downloadUrl || !/\.(jpe?g|png|webp)$/i.test(downloadUrl)) {
        downloadUrl = await resolveAssetUrl(candidate.nasaId);
        await sleep(150);
      }

      if (!downloadUrl) {
        console.log("스킵 (URL 없음)");
        continue;
      }

      const extensionMatch = downloadUrl.match(/\.(jpe?g|png|webp)(?:\?|$)/i);
      const extension = (extensionMatch?.[1] ?? "jpg").toLowerCase().replace(
        "jpeg",
        "jpg",
      );
      const filename = `${candidate.shortname}.${extension}`;
      const destinationPath = path.join(imagesDir, filename);

      if (dryRun) {
        console.log(`dry-run → ${filename}`);
      } else {
        const bytes = await downloadFile(downloadUrl, destinationPath);
        console.log(`${(bytes / 1024).toFixed(0)} KB`);
      }

      newEntries.push({
        name: candidate.name,
        shortname: candidate.shortname,
        url: candidate.photojournalUrl,
        collection: "simple",
        source: "nasa",
        files: [{ filename, variant: "default" }],
      });
      categoryByShortname[candidate.shortname] = candidate.category;
      await sleep(200);
    } catch (error) {
      console.log(`실패: ${error.message}`);
    }
  }

  if (dryRun) {
    console.log(`dry-run 완료: ${newEntries.length}건 예정`);
    return;
  }

  const merged = [...existingEntries];
  for (const entry of newEntries) {
    const existingIndex = merged.findIndex(
      (item) => item.shortname === entry.shortname,
    );
    if (existingIndex >= 0) merged[existingIndex] = entry;
    else merged.push(entry);
  }

  merged.sort((left, right) => left.name.localeCompare(right.name));
  fs.writeFileSync(imagesJsonPath, JSON.stringify(merged, null, 2) + "\n");

  // 카테고리 매핑은 신규+기존 nasa 항목에 대해 shortname 기반 유지
  const fullCategoryMap = { ...categoryByShortname };
  syncImagesCatalog(merged, fullCategoryMap);

  console.log(
    `완료: images.json ${merged.length}건, 신규 다운로드 ${newEntries.length}건`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
