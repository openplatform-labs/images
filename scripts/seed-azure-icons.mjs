#!/usr/bin/env node
/**
 * Microsoft Azure Public Service Icons → icons/azure + icons.json
 * 같은 파일명·같은 내용은 한 번만 등록한다.
 * 사용: node --env-file=.env.local scripts/seed-azure-icons.mjs [icons-root]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const owner = process.env.GITHUB_OWNER ?? "openplatform-labs";
const token = process.env.GITHUB_TOKEN ?? "";
const branch = process.env.GITHUB_BRANCH ?? "main";
const repo = "icons";
const packSlug = "azure";
const sourceUrl = "https://learn.microsoft.com/azure/architecture/icons/";
const iconsRoot =
  process.argv[2] ??
  "/Users/cmars/Downloads/Azure_Public_Service_Icons/Icons";

function githubHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "opensphere-seed-azure-icons",
    ...extra,
  };
}

async function githubJson(url, init = {}) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: { ...githubHeaders(), ...(init.headers ?? {}) },
    });
    const text = await response.text();
    if (response.status === 403 || response.status === 502) {
      const wait = attempt * 2000;
      console.log(`재시도 ${attempt}: ${response.status} ${url}`);
      await new Promise((resolve) => setTimeout(resolve, wait));
      continue;
    }
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(`${init.method ?? "GET"} ${url} → ${response.status} ${text.slice(0, 400)}`);
    }
    return body;
  }
  throw new Error(`요청 실패: ${url}`);
}

function displayName(filename) {
  const stem = filename
    .replace(/\.svg$/i, "")
    .replace(/^\d+-icon-service-/i, "")
    .replace(/[()]/g, " ");
  return stem
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .join(" ");
}

function baseSlug(filename) {
  return displayName(filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function collectIcons() {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.toLowerCase().endsWith(".svg")) files.push(fullPath);
    }
  }
  walk(iconsRoot);

  const seenHashes = new Set();
  const icons = [];
  const usedSlugs = new Set();
  for (const fullPath of files.sort()) {
    const content = fs.readFileSync(fullPath);
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    const filename = path.basename(fullPath);
    const numberMatch = filename.match(/^(\d+)-/);
    const number = numberMatch?.[1] ?? "";
    let slug = baseSlug(filename) || `icon-${number}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${number}`;
    usedSlugs.add(slug);

    icons.push({
      slug,
      name: displayName(filename) || slug,
      content: content.toString("utf8"),
    });
  }
  return icons;
}

async function createBlob(content) {
  const blob = await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: Buffer.from(content, "utf8").toString("base64"),
      encoding: "base64",
    }),
  });
  return blob.sha;
}

async function loadCatalog() {
  const content = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/contents/icons.json?ref=${branch}`,
  );
  if (content.content) {
    return JSON.parse(Buffer.from(content.content, "base64").toString("utf8"));
  }
  const blob = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${content.sha}`,
  );
  return JSON.parse(Buffer.from(blob.content, "base64").toString("utf8"));
}

async function main() {
  if (!token) {
    console.error("GITHUB_TOKEN 이 필요합니다.");
    process.exit(1);
  }
  if (!fs.existsSync(iconsRoot)) {
    throw new Error(`아이콘 폴더 없음: ${iconsRoot}`);
  }

  const icons = collectIcons();
  console.log(`고유 아이콘 ${icons.length}개`);

  const catalog = (await loadCatalog()).filter((entry) => entry.source !== packSlug);
  const treeItems = [];
  for (let index = 0; index < icons.length; index += 1) {
    const icon = icons[index];
    const sha = await createBlob(icon.content);
    treeItems.push({
      path: `icons/${packSlug}/${icon.slug}.svg`,
      mode: "100644",
      type: "blob",
      sha,
    });
    catalog.push({
      name: icon.name,
      shortname: `${packSlug}-${icon.slug}`,
      url: sourceUrl,
      collection: "simple",
      source: packSlug,
      files: [`${packSlug}/${icon.slug}.svg`],
    });
    if ((index + 1) % 50 === 0) console.log(`blob ${index + 1}/${icons.length}`);
  }

  const readme = `# Azure

Microsoft Azure Public Service Icons.

출처: ${sourceUrl}

아이콘은 Azure 아키텍처 다이어그램, 교육 자료, 문서에서 Microsoft 서비스를 나타낼 때만 사용한다.
아이콘 형태를 자르거나 뒤집거나 왜곡하지 않는다.
`;
  treeItems.push({
    path: `icons/${packSlug}/README.md`,
    mode: "100644",
    type: "blob",
    sha: await createBlob(readme),
  });

  catalog.sort((left, right) => left.name.localeCompare(right.name));
  treeItems.push({
    path: "icons.json",
    mode: "100644",
    type: "blob",
    sha: await createBlob(JSON.stringify(catalog, null, 2) + "\n"),
  });

  const ref = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
  );
  const parentSha = ref.object.sha;
  const parentCommit = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`,
  );
  const tree = await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: treeItems,
    }),
  });
  const commit = await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Add azure pack: ${icons.length} Azure Public Service icons`,
      tree: tree.sha,
      parents: [parentSha],
    }),
  });
  await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: commit.sha }),
  });
  console.log(`완료 ${icons.length}개 ${commit.sha}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
