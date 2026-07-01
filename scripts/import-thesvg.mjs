#!/usr/bin/env node
/**
 * glincker/thesvg → logos/ + logos.json 가져오기
 * 사용: node scripts/import-thesvg.mjs [/path/to/thesvg-clone]
 */
import fs from "fs";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const thesvgRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : "/tmp/thesvg-import";
const iconsJsonPath = path.join(thesvgRoot, "src/data/icons.json");
const thesvgPublic = path.join(thesvgRoot, "public");
const logosDir = path.join(projectRoot, "logos");
const logosJsonPath = path.join(projectRoot, "logos.json");

/** variant → 파일명 규칙 (themed 컬렉션) */
function variantFilename(slug, variant) {
  if (variant === "default") return `${slug}.svg`;
  if (variant === "mono") return `${slug}-icon.svg`;
  return `${slug}-${variant}.svg`;
}

function normalizeFiles(filenames, shortname) {
  return filenames.map((filename) => ({
    filename,
    variant: inferVariant(filename, shortname, "themed"),
  }));
}

function inferVariant(filename, shortname, collection) {
  const lower = filename.toLowerCase();
  const base = `${shortname}.svg`;
  if (lower === base) return "default";
  if (lower.endsWith("-color.svg")) return "color";
  if (lower.endsWith("-light.svg")) return "light";
  if (lower.endsWith("-dark.svg")) return "dark";
  if (lower.endsWith("-wordmarklight.svg")) return "wordmarkLight";
  if (lower.endsWith("-wordmarkdark.svg")) return "wordmarkDark";
  if (lower.endsWith("-wordmark.svg")) return "wordmark";
  if (lower.endsWith("-icon.svg") || lower.endsWith("-mono.svg")) return "mono";
  if (lower.endsWith("-16.svg")) return "size16";
  if (lower.endsWith("-32.svg")) return "size32";
  if (lower.endsWith("-64.svg")) return "size64";
  if (lower.endsWith("-line.svg")) return "line";
  return "default";
}

function loadExistingLogos() {
  if (!fs.existsSync(logosJsonPath)) return new Map();
  const entries = JSON.parse(fs.readFileSync(logosJsonPath, "utf-8"));
  return new Map(entries.map((entry) => [entry.shortname, entry]));
}

function main() {
  if (!fs.existsSync(iconsJsonPath)) {
    console.error(`icons.json 없음: ${iconsJsonPath}`);
    process.exit(1);
  }

  const thesvgIcons = JSON.parse(fs.readFileSync(iconsJsonPath, "utf-8"));
  const catalog = loadExistingLogos();

  let copied = 0;
  let skipped = 0;
  let added = 0;
  let merged = 0;

  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  for (const icon of thesvgIcons) {
    const slug = icon.slug;
    const variants = icon.variants ?? {};
    const filenames = [];

    for (const [variant, iconPath] of Object.entries(variants)) {
      const filename = variantFilename(slug, variant);
      const sourcePath = path.join(thesvgPublic, iconPath.replace(/^\//, ""));

      if (!fs.existsSync(sourcePath)) {
        skipped += 1;
        continue;
      }

      const targetPath = path.join(logosDir, filename);
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        copied += 1;
      }
      filenames.push(filename);
    }

    if (filenames.length === 0) continue;

    const uniqueFiles = [...new Set(filenames)].sort();
    const existing = catalog.get(slug);

    if (existing) {
      const existingFilenames = existing.files.map((file) =>
        typeof file === "string" ? file : file.filename,
      );
      const merged = [...new Set([...existingFilenames, ...uniqueFiles])].sort();
      existing.files = normalizeFiles(merged, slug);
      existing.collection = "themed";
      existing.source = "thesvg";
      if (!existing.url && icon.url) existing.url = icon.url;
      merged += 1;
    } else {
      catalog.set(slug, {
        name: icon.title ?? slug,
        shortname: slug,
        url: icon.url ?? "",
        collection: "themed",
        source: "thesvg",
        files: normalizeFiles(uniqueFiles, slug),
      });
      added += 1;
    }
  }

  const output = [...catalog.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );

  fs.writeFileSync(logosJsonPath, JSON.stringify(output, null, 2) + "\n");

  console.log("thesvg import 완료");
  console.log(`  아이콘: ${thesvgIcons.length} (신규 ${added}, 병합 ${merged})`);
  console.log(`  총 catalog: ${output.length}`);
  console.log(`  SVG 복사: ${copied}, 누락 소스: ${skipped}`);
  console.log(`  logos/ 파일 수: ${fs.readdirSync(logosDir).filter((f) => f.endsWith(".svg")).length}`);
}

main();
