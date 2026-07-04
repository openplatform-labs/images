#!/usr/bin/env node
/**
 * Devicon(techicons.dev) → logos/ + logos.json 보강
 * 사용: node scripts/import-devicon.mjs [/path/to/devicon-clone] [icon-name...]
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const deviconRoot = process.argv[2]?.startsWith("/") || process.argv[2]?.startsWith(".")
  ? path.resolve(process.argv[2])
  : path.join("/tmp", "devicon-import");
const iconFilter = process.argv
  .slice(2)
  .filter((argument) => !argument.startsWith("/") && !argument.startsWith("."));
const logosDir = path.join(projectRoot, "logos");
const logosJsonPath = path.join(projectRoot, "logos.json");

/** devicon slug → 기존 catalog shortname */
const SHORTNAME_ALIASES = {
  vuejs: "vue",
  nuxtjs: "nuxt",
  materialui: "material-ui",
  "dot-net": "dotnet",
  amazonwebservices: "aws",
  apacheairflow: "airflow",
  apachekafka: "apache-kafka",
  apachespark: "apache-spark",
  azuresqldatabase: "azure-sql-database",
  bevyengine: "bevy",
  chakraui: "chakra-ui",
  cloudflareworkers: "cloudflare-workers",
  cypressio: "cypress",
  d3js: "d3",
  discordjs: "discord",
  faunadb: "fauna",
  framermotion: "framer",
  githubactions: "github-actions",
  googlecolab: "colab",
  jaegertracing: "jaeger",
  microsoftsqlserver: "microsoft-sql-server",
  nodered: "node-red",
  photonengine: "photon",
  radstudio: "rad-studio",
  reactbootstrap: "react-bootstrap",
  readthedocs: "read-the-docs",
  renpy: "ren-py",
  rollup: "rollupjs",
  scikitlearn: "scikit-learn",
  socketio: "socket-io",
  sourceengine: "source-engine",
  styledcomponents: "styled-components",
  unifiedmodelinglanguage: "uml",
  wasm: "webassembly",
  aframe: "a-frame",
  apollographql: "apollo",
  raspberrypi: "raspberry-pi",
  vscode: "visual-studio-code",
  visualstudio: "visual-studio",
};

/** 신규 항목 표시명 */
const DISPLAY_NAMES = {
  aftereffects: "After Effects",
  antdesign: "Ant Design",
  artixlinux: "Artix Linux",
  azuredevops: "Azure DevOps",
  babylonjs: "Babylon.js",
  backbonejs: "Backbone.js",
  cairo: "Cairo Graphics",
  cloudrun: "Cloud Run",
  cosmosdb: "Cosmos DB",
  groovy: "Apache Groovy",
  intellij: "IntelliJ IDEA",
  jetpackcompose: "Jetpack Compose",
  kalilinux: "Kali Linux",
  kdeneon: "KDE neon",
  knexjs: "Knex.js",
  linuxmint: "Linux Mint",
  newrelic: "New Relic",
  ohmyzsh: "Oh My Zsh",
  reactrouter: "React Router",
  rockylinux: "Rocky Linux",
  rstudio: "RStudio",
  stata: "Stata",
  thealgorithms: "The Algorithms",
  traefikmesh: "Traefik Mesh",
  traefikproxy: "Traefik Proxy",
  travis: "Travis CI",
  vertx: "Eclipse Vert.x",
  visualstudio: "Visual Studio",
  vscode: "Visual Studio Code",
  zustand: "Zustand",
};

const themedFilenamePattern =
  /-(light|dark|color|wordmark|wordmarklight|wordmarkdark|mono|16|32|64|line|horizontal|lockup|octocat)\.svg$/i;

function ensureDeviconClone() {
  const deviconJsonPath = path.join(deviconRoot, "devicon.json");
  if (fs.existsSync(deviconJsonPath)) return;

  console.log(`devicon 클론: ${deviconRoot}`);
  fs.mkdirSync(path.dirname(deviconRoot), { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", "https://github.com/devicons/devicon.git", deviconRoot], {
    stdio: "inherit",
  });
}

function slugifyAltname(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function allocateUniqueShortname(baseShortname, catalog) {
  if (!catalog.has(baseShortname)) return baseShortname;

  let index = 2;
  while (catalog.has(`${baseShortname}-${index}`)) {
    index += 1;
  }
  return `${baseShortname}-${index}`;
}

function allocateUniqueFilename(filename, logosDirectory) {
  const targetPath = path.join(logosDirectory, filename);
  if (!fs.existsSync(targetPath)) return filename;

  const extension = path.extname(filename);
  const stem = filename.slice(0, -extension.length);
  let index = 2;

  while (fs.existsSync(path.join(logosDirectory, `${stem}-${index}${extension}`))) {
    index += 1;
  }

  return `${stem}-${index}${extension}`;
}

/** import 대상 shortname (기존 항목과 겹치면 숫자 접미사) */
function resolveImportShortname(iconName, altnames, catalog) {
  const alias = SHORTNAME_ALIASES[iconName];
  const aliasTaken = alias ? catalog.has(alias) : false;
  const nameTaken = catalog.has(iconName);

  if (!nameTaken && !aliasTaken) {
    if (alias && !catalog.has(alias)) return alias;
    return iconName;
  }

  const baseShortname = nameTaken ? iconName : alias;
  return allocateUniqueShortname(baseShortname, catalog);
}

function mapDeviconFile(shortname, deviconName, deviconFile) {
  const base = deviconFile.replace(/\.svg$/, "");
  const suffix = base.startsWith(`${deviconName}-`)
    ? base.slice(deviconName.length + 1)
    : "original";

  if (suffix === "original") {
    return { filename: `${shortname}.svg`, variant: "default" };
  }
  if (suffix === "plain") {
    return { filename: `${shortname}-icon.svg`, variant: "icon" };
  }
  if (suffix === "line") {
    return { filename: `${shortname}-line.svg`, variant: "line" };
  }
  if (suffix === "original-wordmark") {
    return { filename: `${shortname}-wordmark.svg`, variant: "wordmark" };
  }
  if (suffix === "plain-wordmark") {
    return { filename: `${shortname}-wordmark-icon.svg`, variant: "mono" };
  }

  return {
    filename: `${shortname}-${suffix}.svg`,
    variant: "default",
  };
}

function resolveCollection(entry, filenames) {
  const hasThemedFile = filenames.some(
    (filename) =>
      themedFilenamePattern.test(filename) ||
      (filename !== `${entry.shortname}.svg` &&
        !filename.endsWith("-icon.svg") &&
        filename.startsWith(`${entry.shortname}-`)),
  );

  if (entry.source === "thesvg") return "themed";
  if (hasThemedFile) return "themed";
  return "simple";
}

function formatDisplayName(deviconName, altnames) {
  if (DISPLAY_NAMES[deviconName]) return DISPLAY_NAMES[deviconName];
  if (altnames?.[0] && /[A-Z]/.test(altnames[0])) return altnames[0];

  return deviconName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/js$/i, ".js")
    .replace(/db$/i, " DB")
    .replace(/io$/i, ".io")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function loadCatalog() {
  const entries = JSON.parse(fs.readFileSync(logosJsonPath, "utf-8"));
  return new Map(entries.map((entry) => [entry.shortname, entry]));
}

function main() {
  ensureDeviconClone();

  const deviconJsonPath = path.join(deviconRoot, "devicon.json");
  if (!fs.existsSync(deviconJsonPath)) {
    console.error(`devicon.json 없음: ${deviconJsonPath}`);
    process.exit(1);
  }

  const deviconIcons = JSON.parse(fs.readFileSync(deviconJsonPath, "utf-8"));
  const catalog = loadCatalog();

  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  let copied = 0;
  let skipped = 0;
  let added = 0;
  let renamed = 0;

  for (const icon of deviconIcons) {
    if (iconFilter.length > 0 && !iconFilter.includes(icon.name)) continue;

    const iconDir = path.join(deviconRoot, "icons", icon.name);
    if (!fs.existsSync(iconDir)) continue;

    const shortname = resolveImportShortname(icon.name, icon.altnames, catalog);
    const deviconFiles = fs
      .readdirSync(iconDir)
      .filter((filename) => filename.endsWith(".svg"));

    const mappedFiles = deviconFiles.map((filename) =>
      mapDeviconFile(shortname, icon.name, filename),
    );

    const copiedFiles = [];

    for (const mapped of mappedFiles) {
      const sourceFile = deviconFiles.find((filename) => {
        const mappedCandidate = mapDeviconFile(shortname, icon.name, filename);
        return mappedCandidate.filename === mapped.filename;
      });

      if (!sourceFile) continue;

      const sourcePath = path.join(iconDir, sourceFile);
      const targetFilename = allocateUniqueFilename(mapped.filename, logosDir);
      const targetPath = path.join(logosDir, targetFilename);

      if (targetFilename !== mapped.filename) renamed += 1;

      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        copied += 1;
      } else {
        skipped += 1;
      }

      copiedFiles.push({
        filename: targetFilename,
        variant: mapped.variant,
      });
    }

    if (copiedFiles.length === 0) continue;

    const filenames = copiedFiles.map((file) => file.filename);
    const collection = resolveCollection(
      { shortname, source: "devicon" },
      filenames,
    );

    catalog.set(shortname, {
      name:
        shortname.includes("-") && /-\d+$/.test(shortname)
          ? `${formatDisplayName(icon.name, icon.altnames)} (${shortname.match(/-(\d+)$/)?.[1] ?? "2"})`
          : formatDisplayName(icon.name, icon.altnames),
      shortname,
      url: `https://techicons.dev/icons/${icon.name}`,
      collection,
      source: "devicon",
      files: copiedFiles.sort((left, right) =>
        left.filename.localeCompare(right.filename),
      ),
    });
    added += 1;
  }

  const output = [...catalog.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );

  fs.writeFileSync(logosJsonPath, JSON.stringify(output, null, 2) + "\n");

  console.log("devicon(techicons.dev) import 완료");
  console.log(`  신규 항목: ${added}`);
  console.log(`  SVG 복사: ${copied} (기존 파일 유지: ${skipped}, 파일명 변경: ${renamed})`);
  console.log(`  총 catalog: ${output.length}`);
  console.log(
    `  logos/ 파일 수: ${fs.readdirSync(logosDir).filter((file) => file.endsWith(".svg")).length}`,
  );
}

main();
