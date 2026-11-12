#!/usr/bin/env node
/**
 * Lucide Icons (ISC) 중 file/folder/explorer 계열 → icons/file-explorer + icons.json
 * Flaticon 등 재배포 불가 소스는 쓰지 않음.
 * 사용: node --env-file=.env.local scripts/seed-file-explorer-lucide.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const owner = process.env.GITHUB_OWNER ?? "openplatform-labs";
const token = process.env.GITHUB_TOKEN ?? "";
const branch = process.env.GITHUB_BRANCH ?? "main";
const repo = "icons";
const packSlug = "file-explorer";
const lucideSourceUrl = "https://lucide.dev/icons/";
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "file-explorer-lucide-"));

const weatherCloudNames = new Set([
  "cloud-drizzle",
  "cloud-fog",
  "cloud-hail",
  "cloud-lightning",
  "cloud-moon",
  "cloud-moon-rain",
  "cloud-rain",
  "cloud-rain-wind",
  "cloud-snow",
  "cloud-sun",
  "cloud-sun-rain",
  "cloudy",
]);

const exactNames = new Set([
  "archive",
  "archive-restore",
  "archive-x",
  "bookmark",
  "clipboard",
  "cloud",
  "cloud-alert",
  "cloud-backup",
  "cloud-check",
  "cloud-cog",
  "cloud-download",
  "cloud-off",
  "cloud-sync",
  "cloud-upload",
  "copy",
  "database",
  "download",
  "export",
  "external-link",
  "filter",
  "hard-drive",
  "hard-drive-download",
  "hard-drive-upload",
  "history",
  "home",
  "import",
  "inbox",
  "key",
  "laptop",
  "layout-grid",
  "layout-list",
  "link",
  "list",
  "lock",
  "mail",
  "monitor",
  "package",
  "printer",
  "refresh-cw",
  "save",
  "scan-line",
  "scissors",
  "search",
  "server",
  "settings",
  "share-2",
  "star",
  "tag",
  "trash",
  "trash-2",
  "trash-off",
  "upload",
  "usb",
  "files",
  "folders",
  "file",
  "folder",
]);

function isFileExplorerIcon(name) {
  if (weatherCloudNames.has(name)) return false;
  if (exactNames.has(name)) return true;
  if (name.startsWith("file-") || name.startsWith("folder-")) return true;
  if (name.startsWith("clipboard-") || name.startsWith("bookmark-")) return true;
  if (name.startsWith("archive-")) return true;
  return false;
}

function displayName(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function githubJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "opensphere-seed-file-explorer",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${url} → ${response.status} ${text.slice(0, 400)}`);
  }
  return body;
}

async function downloadLucideIcons() {
  console.log("Lucide 저장소 트리 조회…");
  const tree = await fetch(
    "https://api.github.com/repos/lucide-icons/lucide/git/trees/main?recursive=1",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "opensphere-seed-file-explorer",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  ).then((response) => response.json());

  const iconPaths = (tree.tree ?? [])
    .filter((entry) => entry.path.startsWith("icons/") && entry.path.endsWith(".svg"))
    .map((entry) => entry.path.slice("icons/".length, -".svg".length))
    .filter(isFileExplorerIcon)
    .sort();

  if (iconPaths.length === 0) {
    throw new Error("선택된 Lucide 아이콘이 없습니다.");
  }

  const packDir = path.join(workRoot, "icons", packSlug);
  fs.mkdirSync(packDir, { recursive: true });

  // lucide-static npm 패키지에서 SVG 추출 (ISC)
  const extractDir = path.join(workRoot, "npm");
  fs.mkdirSync(extractDir, { recursive: true });
  console.log(`lucide-static npm 다운로드 (${iconPaths.length}개 대상)…`);
  execFileSync("npm", ["pack", "lucide-static@latest", "--pack-destination", extractDir], {
    stdio: "inherit",
  });
  const tarball = fs.readdirSync(extractDir).find((name) => name.endsWith(".tgz"));
  if (!tarball) throw new Error("lucide-static tarball 을 찾지 못했습니다.");
  execFileSync("tar", ["-xzf", path.join(extractDir, tarball), "-C", extractDir]);
  const svgDir = path.join(extractDir, "package", "icons");
  if (!fs.existsSync(svgDir)) {
    throw new Error("package/icons 를 찾지 못했습니다.");
  }

  const stored = [];
  for (const slug of iconPaths) {
    const sourcePath = path.join(svgDir, `${slug}.svg`);
    if (!fs.existsSync(sourcePath)) continue;
    fs.copyFileSync(sourcePath, path.join(packDir, `${slug}.svg`));
    stored.push(slug);
  }

  const licenseSource = path.join(extractDir, "package", "LICENSE");
  if (fs.existsSync(licenseSource)) {
    fs.copyFileSync(licenseSource, path.join(packDir, "LICENSE"));
  } else {
    const licenseResponse = await fetch(
      "https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE",
    );
    if (licenseResponse.ok) {
      fs.writeFileSync(path.join(packDir, "LICENSE"), await licenseResponse.text());
    }
  }

  const attribution = `# File Explorer pack

Icons in this folder are from [Lucide](${lucideSourceUrl}) (ISC License).
Copyright (c) Lucide Icons and Contributors.

See LICENSE in this folder. Weather-related cloud icons were excluded.
Only file / folder / explorer related icons were copied.
`;
  fs.writeFileSync(path.join(packDir, "README.md"), attribution);

  console.log(`복사 완료: ${stored.length}개`);
  return stored;
}

async function commitToIconsRepo(slugs) {
  console.log("icons 카탈로그·파일 GitHub 커밋…");
  const catalogPath = "icons.json";
  const contentResponse = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/contents/${catalogPath}?ref=${branch}`,
  );
  const catalog = JSON.parse(
    Buffer.from(contentResponse.content, "base64").toString("utf-8"),
  );

  // 기존 file-explorer 항목 제거 후 재등록
  const kept = catalog.filter((entry) => entry.source !== packSlug);
  const newEntries = slugs.map((slug) => ({
    name: displayName(slug),
    shortname: `${packSlug}-${slug}`,
    url: `${lucideSourceUrl}${slug}`,
    collection: "simple",
    source: packSlug,
    files: [`${packSlug}/${slug}.svg`],
  }));
  const nextCatalog = [...kept, ...newEntries].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  const ref = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
  );
  const parentSha = ref.object.sha;
  const parentCommit = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`,
  );

  const treeItems = [];
  for (const slug of slugs) {
    const svg = fs.readFileSync(
      path.join(workRoot, "icons", packSlug, `${slug}.svg`),
      "utf-8",
    );
    const blob = await githubJson(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: Buffer.from(svg, "utf-8").toString("base64"),
          encoding: "base64",
        }),
      },
    );
    treeItems.push({
      path: `icons/${packSlug}/${slug}.svg`,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  for (const extra of ["LICENSE", "README.md"]) {
    const extraPath = path.join(workRoot, "icons", packSlug, extra);
    if (!fs.existsSync(extraPath)) continue;
    const blob = await githubJson(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: Buffer.from(fs.readFileSync(extraPath)).toString("base64"),
          encoding: "base64",
        }),
      },
    );
    treeItems.push({
      path: `icons/${packSlug}/${extra}`,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const catalogBlob = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: Buffer.from(JSON.stringify(nextCatalog, null, 2) + "\n").toString(
          "base64",
        ),
        encoding: "base64",
      }),
    },
  );
  treeItems.push({
    path: catalogPath,
    mode: "100644",
    type: "blob",
    sha: catalogBlob.sha,
  });

  const tree = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: parentCommit.tree.sha,
        tree: treeItems,
      }),
    },
  );

  const commit = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add ${packSlug} pack: ${slugs.length} Lucide (ISC) file/folder icons`,
        tree: tree.sha,
        parents: [parentSha],
      }),
    },
  );

  await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commit.sha }),
    },
  );

  return { commitSha: commit.sha, count: slugs.length, catalogTotal: nextCatalog.length };
}

async function main() {
  if (!token) {
    console.error("GITHUB_TOKEN 이 필요합니다.");
    process.exit(1);
  }

  try {
    const slugs = await downloadLucideIcons();
    const result = await commitToIconsRepo(slugs);
    console.log(
      `완료: ${result.count}개 → https://github.com/${owner}/${repo}/commit/${result.commitSha}`,
    );
    console.log(`카탈로그 총 ${result.catalogTotal}건, pack=${packSlug}`);
  } finally {
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
