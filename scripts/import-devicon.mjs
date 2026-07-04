#!/usr/bin/env node
/**
 * Devicon(techicons.dev) → logos/ + logos.json 보강
 * 사용: node scripts/import-devicon.mjs [/path/to/devicon-clone]
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const deviconRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join("/tmp", "devicon-import");
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

function resolveShortname(deviconName, altnames, catalog) {
  if (catalog.has(deviconName)) return deviconName;

  const alias = SHORTNAME_ALIASES[deviconName];
  if (alias && catalog.has(alias)) return alias;

  for (const altname of altnames ?? []) {
    const slug = slugifyAltname(altname);
    if (catalog.has(slug)) return slug;

    const compact = normalizeToken(altname);
    for (const shortname of catalog.keys()) {
      if (normalizeToken(shortname) === compact) return shortname;
    }
  }

  const normalized = normalizeToken(deviconName);
  for (const shortname of catalog.keys()) {
    if (normalizeToken(shortname) === normalized) return shortname;
  }

  return deviconName;
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
  let enriched = 0;

  for (const icon of deviconIcons) {
    const iconDir = path.join(deviconRoot, "icons", icon.name);
    if (!fs.existsSync(iconDir)) continue;

    const shortname = resolveShortname(icon.name, icon.altnames, catalog);
    const deviconFiles = fs
      .readdirSync(iconDir)
      .filter((filename) => filename.endsWith(".svg"));

    const mappedFiles = deviconFiles.map((filename) =>
      mapDeviconFile(shortname, icon.name, filename),
    );

    const existing = catalog.get(shortname);
    const existingFilenames = new Set(
      (existing?.files ?? []).map((file) =>
        typeof file === "string" ? file : file.filename,
      ),
    );

    const filesToAdd = mappedFiles.filter(
      (file) => !existingFilenames.has(file.filename),
    );

    if (filesToAdd.length === 0) continue;

    for (const mapped of filesToAdd) {
      const sourceFile = deviconFiles.find((filename) => {
        const mappedCandidate = mapDeviconFile(shortname, icon.name, filename);
        return mappedCandidate.filename === mapped.filename;
      });

      if (!sourceFile) continue;

      const sourcePath = path.join(iconDir, sourceFile);
      const targetPath = path.join(logosDir, mapped.filename);

      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        copied += 1;
      } else {
        skipped += 1;
      }
    }

    if (existing) {
      const mergedFilenames = [
        ...existingFilenames,
        ...filesToAdd.map((file) => file.filename),
      ];
      const collection = resolveCollection(existing, mergedFilenames);

      existing.files = mergedFilenames
        .sort()
        .map((filename) => {
          const fromDevicon = filesToAdd.find(
            (file) => file.filename === filename,
          );
          const previous = existing.files.find((file) =>
            typeof file === "string"
              ? file === filename
              : file.filename === filename,
          );

          return {
            filename,
            variant:
              fromDevicon?.variant ??
              (typeof previous === "string"
                ? undefined
                : previous?.variant) ??
              mapDeviconFile(shortname, icon.name, `${icon.name}.svg`).variant,
          };
        });

      existing.collection = collection;
      enriched += 1;
    } else {
      const filenames = filesToAdd.map((file) => file.filename);
      const collection = resolveCollection(
        { shortname, source: "devicon" },
        filenames,
      );

      catalog.set(shortname, {
        name: formatDisplayName(icon.name, icon.altnames),
        shortname,
        url: `https://techicons.dev/icons/${icon.name}`,
        collection,
        source: "devicon",
        files: filesToAdd
          .sort((left, right) => left.filename.localeCompare(right.filename))
          .map((file) => ({
            filename: file.filename,
            variant: file.variant,
          })),
      });
      added += 1;
    }
  }

  const output = [...catalog.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );

  fs.writeFileSync(logosJsonPath, JSON.stringify(output, null, 2) + "\n");

  console.log("devicon(techicons.dev) import 완료");
  console.log(`  신규 항목: ${added}`);
  console.log(`  기존 보강: ${enriched}`);
  console.log(`  SVG 복사: ${copied} (기존 파일 유지: ${skipped})`);
  console.log(`  총 catalog: ${output.length}`);
  console.log(
    `  logos/ 파일 수: ${fs.readdirSync(logosDir).filter((file) => file.endsWith(".svg")).length}`,
  );
}

main();
