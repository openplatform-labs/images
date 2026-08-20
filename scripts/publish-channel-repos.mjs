#!/usr/bin/env node
/**
 * 채널 이름과 같은 GitHub 자산 레포를 만들고 파일을 올린다.
 * 사용: node --env-file=.env.local scripts/publish-channel-repos.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const owner = process.env.GITHUB_OWNER ?? "openplatform-labs";
const token = process.env.GITHUB_TOKEN ?? "";
const branch = process.env.GITHUB_BRANCH ?? "main";

const channels = [
  {
    id: "logos",
    site: "https://logos.opl.io.kr",
    description: "SVG logo assets for logos.opl.io.kr",
  },
  {
    id: "images",
    site: "https://images.opl.io.kr",
    description: "Image assets for images.opl.io.kr",
  },
  {
    id: "illust",
    site: "https://illust.opl.io.kr",
    description: "Illustration assets for illust.opl.io.kr",
  },
  {
    id: "icons",
    site: "https://icons.opl.io.kr",
    description: "Icon pack assets for icons.opl.io.kr",
  },
  {
    id: "pictograms",
    site: "https://pictograms.opl.io.kr",
    description: "Pictogram assets for pictograms.opl.io.kr",
  },
  {
    id: "avatars",
    site: "https://avatars.opl.io.kr",
    description: "Avatar assets for avatars.opl.io.kr",
  },
];

if (!token) {
  console.error("GITHUB_TOKEN 이 필요합니다.");
  process.exit(1);
}

const apiHeaders = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "opensphere-publish-channel-repos",
};

function gitEnv() {
  const askPass = path.join(os.tmpdir(), "opensphere-git-askpass.sh");
  fs.writeFileSync(
    askPass,
    "#!/bin/sh\ncase \"$1\" in\n*Username*) echo x-access-token ;;\n*) echo \"$GITHUB_TOKEN\" ;;\nesac\n",
  );
  fs.chmodSync(askPass, 0o700);
  return {
    ...process.env,
    GIT_ASKPASS: askPass,
    GIT_TERMINAL_PROMPT: "0",
    GITHUB_TOKEN: token,
  };
}

function run(command, args, options = {}) {
  const silent = options.silent === true;
  const rest = { ...options };
  delete rest.silent;
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: silent ? "pipe" : "inherit",
    ...rest,
  });
}

function sourceDir(channelId) {
  return path.join(projectRoot, channelId);
}

function sourceCatalog(channelId) {
  return path.join(projectRoot, `${channelId}.json`);
}

async function githubJson(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...apiHeaders, ...init.headers } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

async function ensureRepo(channel) {
  const { response, body } = await githubJson(`https://api.github.com/repos/${owner}/${channel.id}`);
  if (response.ok) {
    console.log(`레포 있음: ${owner}/${channel.id}`);
    return;
  }
  if (response.status !== 404) {
    throw new Error(`${owner}/${channel.id} 조회 실패: ${response.status} ${JSON.stringify(body)}`);
  }
  console.log(`레포 생성: ${owner}/${channel.id}`);
  const created = await githubJson("https://api.github.com/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: channel.id,
      description: channel.description,
      homepage: channel.site,
      private: false,
      auto_init: true,
      has_issues: false,
      has_projects: false,
      has_wiki: false,
    }),
  });
  if (!created.response.ok) {
    throw new Error(`레포 생성 실패: ${created.response.status} ${JSON.stringify(created.body)}`);
  }
}

function writeReadme(targetRoot, channel) {
  const contents = `# ${channel.id}

${channel.site} 자산 저장소입니다.

- 카탈로그: \`${channel.id}.json\`
- 파일: \`${channel.id}/\`
- CDN: \`https://cdn.statically.io/gh/${owner}/${channel.id}@${branch}/${channel.id}/\`

웹 갤러리는 Host로 채널이 나뉘며, GitHub 레포 이름은 사이트 이름과 같습니다.
`;
  fs.writeFileSync(path.join(targetRoot, "README.md"), contents);
}

async function ensureLocalSources() {
  const missing = channels.filter((channel) => {
    if (channel.id === "avatars") return false;
    const dir = sourceDir(channel.id);
    if (!fs.existsSync(dir)) return true;
    if (channel.id === "icons" && !fs.existsSync(path.join(dir, "carbon"))) return true;
    return false;
  });
  if (!missing.length) return;

  const sparseRoot = path.join(os.tmpdir(), "opensphere-shared-images");
  if (!fs.existsSync(path.join(sparseRoot, ".git"))) {
    console.log("공유 images 레포에서 빠진 자산을 가져옵니다.");
    run("git", [
      "clone",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
      "https://github.com/openplatform-labs/images.git",
      sparseRoot,
    ]);
  }
  const checkoutDirs = missing.map((channel) => channel.id);
  run("git", ["sparse-checkout", "set", ...checkoutDirs], { cwd: sparseRoot });
  for (const channel of missing) {
    const fromDir = path.join(sparseRoot, channel.id);
    const fromJson = path.join(sparseRoot, `${channel.id}.json`);
    if (fs.existsSync(fromDir)) {
      fs.rmSync(sourceDir(channel.id), { recursive: true, force: true });
      fs.cpSync(fromDir, sourceDir(channel.id), { recursive: true });
      console.log(`복사: ${channel.id}/`);
    }
    if (!fs.existsSync(sourceCatalog(channel.id))) {
      const catalogUrl = `https://raw.githubusercontent.com/openplatform-labs/images/main/${channel.id}.json`;
      const catalogResponse = await fetch(catalogUrl);
      if (catalogResponse.ok) {
        fs.writeFileSync(sourceCatalog(channel.id), await catalogResponse.text());
        console.log(`복사: ${channel.id}.json`);
      }
    }
  }
}

function copyChannelTree(channel, targetRoot) {
  const dir = sourceDir(channel.id);
  const catalog = sourceCatalog(channel.id);
  fs.mkdirSync(path.join(targetRoot, channel.id), { recursive: true });
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join(targetRoot, channel.id), { recursive: true });
  }
  if (fs.existsSync(catalog)) {
    fs.copyFileSync(catalog, path.join(targetRoot, `${channel.id}.json`));
  } else {
    fs.writeFileSync(path.join(targetRoot, `${channel.id}.json`), "[]\n");
  }
  writeReadme(targetRoot, channel);
}

function publishChannel(channel) {
  const workRoot = path.join(os.tmpdir(), `opensphere-asset-${channel.id}`);
  fs.rmSync(workRoot, { recursive: true, force: true });
  const remote = `https://github.com/${owner}/${channel.id}.git`;
  console.log(`클론: ${owner}/${channel.id}`);
  run("git", ["clone", "--depth", "1", remote, workRoot], { silent: true });
  const licensePath = path.join(workRoot, "LICENSE.txt");
  const licenseText = fs.existsSync(licensePath) ? fs.readFileSync(licensePath, "utf8") : "";
  for (const name of fs.readdirSync(workRoot)) {
    if (name === ".git") continue;
    fs.rmSync(path.join(workRoot, name), { recursive: true, force: true });
  }
  copyChannelTree(channel, workRoot);
  if (channel.id === "logos") {
    fs.rmSync(path.join(workRoot, "illust"), { recursive: true, force: true });
    fs.rmSync(path.join(workRoot, "illust.json"), { force: true });
  }
  if (licenseText) {
    fs.writeFileSync(path.join(workRoot, "LICENSE.txt"), licenseText);
  }
  run("git", ["-C", workRoot, "add", "-A"]);
  const status = run("git", ["-C", workRoot, "status", "--porcelain"], { silent: true });
  if (!status.trim()) {
    console.log(`변경 없음: ${channel.id}`);
    return;
  }
  run("git", [
    "-C",
    workRoot,
    "-c",
    "user.name=opensphere-platform",
    "-c",
    "user.email=opensphere-platform@users.noreply.github.com",
    "commit",
    "-m",
    `${channel.id}.opl.io.kr 자산 레포로 정리`,
  ]);
  run("git", ["-C", workRoot, "-c", "credential.helper=", "push", "origin", `HEAD:${branch}`], {
    env: gitEnv(),
  });
  console.log(`완료: https://github.com/${owner}/${channel.id}`);
}

async function main() {
  const auth = await githubJson("https://api.github.com/user");
  console.log(`GitHub: ${auth.body.login} → ${owner}`);
  await ensureLocalSources();
  const selected = process.argv.slice(2);
  const targets = selected.length
    ? channels.filter((channel) => selected.includes(channel.id))
    : channels;
  if (!targets.length) {
    throw new Error("지정한 채널이 없습니다.");
  }
  for (const channel of targets) {
    await ensureRepo(channel);
    publishChannel(channel);
  }
}

await main();
