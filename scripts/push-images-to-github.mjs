#!/usr/bin/env node
/**
 * 로컬 images/ + images.json → GitHub 단일 커밋 푸시 (Statically CDN용)
 * 사용: node --env-file=.env.local scripts/push-images-to-github.mjs
 *   또는 서버: node --env-file=.env.production scripts/push-images-to-github.mjs
 */
import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const imagesDir = path.join(projectRoot, "images");
const imagesJsonPath = path.join(projectRoot, "images.json");

const owner = process.env.GITHUB_OWNER ?? "openplatform-labs";
const repo = process.env.GITHUB_REPO ?? "images";
const branch = process.env.GITHUB_BRANCH ?? "main";
const token = process.env.GITHUB_TOKEN ?? "";

if (!token) {
  console.error("GITHUB_TOKEN 이 필요합니다.");
  process.exit(1);
}

if (!fs.existsSync(imagesJsonPath)) {
  console.error("images.json 없음");
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

async function main() {
  const auth = await octokit.users.getAuthenticated();
  console.log(`auth: ${auth.data.login} → ${owner}/${repo}@${branch}`);

  const repoInfo = await octokit.repos.get({ owner, repo });
  if (!repoInfo.data.permissions?.push) {
    console.error("이 토큰에 push 권한이 없습니다.");
    process.exit(1);
  }

  const refResponse = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const parentSha = refResponse.data.object.sha;
  const parentCommit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });

  const treeItems = [];
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((name) => /\.(jpe?g|png|webp|gif|svg)$/i.test(name));

  console.log(`이미지 ${imageFiles.length}개 + images.json 업로드 중...`);

  for (const [index, filename] of imageFiles.entries()) {
    const buffer = fs.readFileSync(path.join(imagesDir, filename));
    const blob = await octokit.git.createBlob({
      owner,
      repo,
      content: buffer.toString("base64"),
      encoding: "base64",
    });
    treeItems.push({
      path: `images/${filename}`,
      mode: "100644",
      type: "blob",
      sha: blob.data.sha,
    });
    if ((index + 1) % 10 === 0 || index + 1 === imageFiles.length) {
      console.log(`  blob ${index + 1}/${imageFiles.length}`);
    }
  }

  const imagesJsonContent = fs.readFileSync(imagesJsonPath);
  const imagesJsonBlob = await octokit.git.createBlob({
    owner,
    repo,
    content: imagesJsonContent.toString("base64"),
    encoding: "base64",
  });
  treeItems.push({
    path: "images.json",
    mode: "100644",
    type: "blob",
    sha: imagesJsonBlob.data.sha,
  });

  // .gitkeep 유지
  const gitkeepBlob = await octokit.git.createBlob({
    owner,
    repo,
    content: Buffer.from("").toString("base64"),
    encoding: "base64",
  });
  treeItems.push({
    path: "images/.gitkeep",
    mode: "100644",
    type: "blob",
    sha: gitkeepBlob.data.sha,
  });

  // 구형 shortname.jpg (해상도 suffix 없음) 제거
  const entries = JSON.parse(fs.readFileSync(imagesJsonPath, "utf-8"));
  for (const entry of entries) {
    for (const extension of ["jpg", "jpeg", "png", "webp", "gif"]) {
      treeItems.push({
        path: `images/${entry.shortname}.${extension}`,
        mode: "100644",
        type: "blob",
        sha: null,
      });
    }
  }

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.data.tree.sha,
    tree: treeItems,
  });

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: `Add multi-resolution NASA space images (${imageFiles.length} files)`,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
  });

  console.log(`커밋 완료: ${commit.data.sha}`);
  console.log(
    `CDN 예시: https://cdn.statically.io/gh/${owner}/${repo}@${branch}/images/${imageFiles[0]}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
