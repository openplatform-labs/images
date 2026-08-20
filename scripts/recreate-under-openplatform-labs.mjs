#!/usr/bin/env node
/**
 * openplatform-labs 아래 빈 레포를 만들고, 현재 자산을 push 한 뒤
 * opensphere-platform 원본 레포를 삭제한다.
 *
 * 필요:
 *   GITHUB_TOKEN = openplatform-labs 계정 PAT (repo)
 *   GITHUB_SOURCE_TOKEN = opensphere-platform 계정 PAT (delete_repo) — 없으면 GITHUB_TOKEN과 동일 시도
 *
 * 사용: node --env-file=.env.local scripts/recreate-under-openplatform-labs.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const destOwner = "openplatform-labs";
const sourceOwner = "opensphere-platform";
const destToken = process.env.GITHUB_TOKEN ?? "";
const sourceToken = process.env.GITHUB_SOURCE_TOKEN ?? destToken;
const branch = process.env.GITHUB_BRANCH ?? "main";

const jobs = [
  {
    name: "logos",
    description: "SVG logo assets for logos.opl.io.kr",
    homepage: "https://logos.opl.io.kr",
    sourceDir: path.join(projectRoot, "logos"),
    catalog: path.join(projectRoot, "logos.json"),
    extraDeletes: ["illust", "illust.json"],
    skipCreate: false,
    deleteSourceRepo: `${sourceOwner}/logos`,
  },
  {
    name: "images",
    description: "Image assets for images.opl.io.kr",
    homepage: "https://images.opl.io.kr",
    sourceDir: path.join(projectRoot, "images"),
    catalog: path.join(projectRoot, "images.json"),
    extraDeletes: [],
    skipCreate: true, // 웹앱 레포가 이미 있음. 자산만 push
    deleteSourceRepo: `${sourceOwner}/images`,
  },
  {
    name: "illust",
    description: "Illustration assets for illust.opl.io.kr",
    homepage: "https://illust.opl.io.kr",
    sourceDir: path.join(projectRoot, "illust"),
    catalog: path.join(projectRoot, "illust.json"),
    extraDeletes: [],
    skipCreate: false,
    deleteSourceRepo: `${sourceOwner}/illust`,
  },
  {
    name: "icons",
    description: "Icon pack assets for icons.opl.io.kr",
    homepage: "https://icons.opl.io.kr",
    sourceDir: path.join(projectRoot, "icons"),
    catalog: path.join(projectRoot, "icons.json"),
    extraDeletes: [],
    skipCreate: false,
    deleteSourceRepo: `${sourceOwner}/icons`,
  },
  {
    name: "pictograms",
    description: "Pictogram assets for pictograms.opl.io.kr",
    homepage: "https://pictograms.opl.io.kr",
    sourceDir: path.join(projectRoot, "pictograms"),
    catalog: path.join(projectRoot, "pictograms.json"),
    extraDeletes: [],
    skipCreate: false,
    deleteSourceRepo: `${sourceOwner}/pictograms`,
  },
  {
    name: "avatars",
    description: "Avatar assets for avatars.opl.io.kr",
    homepage: "https://avatars.opl.io.kr",
    sourceDir: path.join(projectRoot, "avatars"),
    catalog: path.join(projectRoot, "avatars.json"),
    extraDeletes: [],
    skipCreate: false,
    deleteSourceRepo: `${sourceOwner}/avatars`,
  },
];

if (!destToken) {
  console.error("GITHUB_TOKEN 이 필요합니다. openplatform-labs 계정 PAT 를 .env.local 에 넣으세요.");
  process.exit(1);
}

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "opensphere-recreate",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubJson(token, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { ...apiHeaders(token), ...init.headers },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
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
    GITHUB_TOKEN: destToken,
  };
}

function writeReadme(targetRoot, job) {
  fs.writeFileSync(
    path.join(targetRoot, "README.md"),
    `# ${job.name}\n\n${job.homepage} 자산 저장소입니다.\n\n- 카탈로그: \`${job.name}.json\`\n- 파일: \`${job.name}/\`\n`,
  );
}

function copyAssets(job, targetRoot) {
  fs.mkdirSync(path.join(targetRoot, job.name), { recursive: true });
  if (fs.existsSync(job.sourceDir)) {
    fs.cpSync(job.sourceDir, path.join(targetRoot, job.name), { recursive: true });
  }
  if (fs.existsSync(job.catalog)) {
    fs.copyFileSync(job.catalog, path.join(targetRoot, `${job.name}.json`));
  } else if (job.name === "avatars") {
    fs.writeFileSync(path.join(targetRoot, "avatars.json"), "[]\n");
  }
  writeReadme(targetRoot, job);
  for (const extra of job.extraDeletes) {
    fs.rmSync(path.join(targetRoot, extra), { recursive: true, force: true });
  }
}

async function ensureRepo(job, login) {
  const { response } = await githubJson(destToken, `https://api.github.com/repos/${destOwner}/${job.name}`);
  if (response.ok) {
    console.log(`있음: ${destOwner}/${job.name}`);
    return;
  }
  if (job.skipCreate) {
    throw new Error(`${destOwner}/${job.name} 이 있어야 합니다.`);
  }
  if (login !== destOwner) {
    throw new Error(`GITHUB_TOKEN 주체가 ${login} 입니다. ${destOwner} 계정 PAT 가 필요합니다.`);
  }
  console.log(`생성: ${destOwner}/${job.name}`);
  const created = await githubJson(destToken, "https://api.github.com/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: job.name,
      description: job.description,
      homepage: job.homepage,
      private: false,
      auto_init: true,
      has_issues: false,
      has_projects: false,
      has_wiki: false,
    }),
  });
  if (!created.response.ok) {
    throw new Error(`생성 실패 ${job.name}: ${created.response.status} ${JSON.stringify(created.body)}`);
  }
  // GitHub 가 empty 레포를 clone 가능하게 만들 때까지 잠시 기다린다
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

function pushJob(job) {
  const workRoot = path.join(os.tmpdir(), `opensphere-dest-${job.name}`);
  fs.rmSync(workRoot, { recursive: true, force: true });
  const remote = `https://github.com/${destOwner}/${job.name}.git`;
  console.log(`클론: ${destOwner}/${job.name}`);
  run("git", ["clone", "--depth", "1", remote, workRoot], { silent: true, env: gitEnv() });
  if (!job.skipCreate) {
    for (const name of fs.readdirSync(workRoot)) {
      if (name === ".git") continue;
      fs.rmSync(path.join(workRoot, name), { recursive: true, force: true });
    }
    copyAssets(job, workRoot);
  } else {
    copyAssets(job, workRoot);
  }
  run("git", ["-C", workRoot, "add", "-A"]);
  const status = run("git", ["-C", workRoot, "status", "--porcelain"], { silent: true });
  if (!status.trim()) {
    console.log(`변경 없음: ${job.name}`);
    return;
  }
  run("git", [
    "-C",
    workRoot,
    "-c",
    "user.name=openplatform-labs",
    "-c",
    "user.email=openplatform-labs@users.noreply.github.com",
    "commit",
    "-m",
    `${job.name} 자산을 ${destOwner}/${job.name} 로 이전`,
  ]);
  run("git", ["-C", workRoot, "-c", "credential.helper=", "push", "origin", `HEAD:${branch}`], {
    env: gitEnv(),
  });
  console.log(`push 완료: https://github.com/${destOwner}/${job.name}`);
}

async function deleteSource(job) {
  if (!job.deleteSourceRepo) return;
  console.log(`삭제 시도: ${job.deleteSourceRepo}`);
  const { response, body } = await githubJson(
    sourceToken,
    `https://api.github.com/repos/${job.deleteSourceRepo}`,
    { method: "DELETE" },
  );
  if (response.status === 204) {
    console.log(`삭제됨: ${job.deleteSourceRepo}`);
    return;
  }
  console.error(`삭제 실패 ${job.deleteSourceRepo}: ${response.status} ${JSON.stringify(body)}`);
}

async function main() {
  const me = await githubJson(destToken, "https://api.github.com/user");
  if (!me.response.ok) {
    throw new Error(`토큰 확인 실패: ${me.response.status} ${JSON.stringify(me.body)}`);
  }
  const login = me.body.login;
  console.log(`dest token login=${login} → 목표 ${destOwner}`);
  if (login !== destOwner) {
    throw new Error(
      `지금 토큰은 ${login} 계정입니다. openplatform-labs 로 로그인한 뒤 PAT 를 발급해 .env.local 의 GITHUB_TOKEN 을 그 값으로 바꾸세요.`,
    );
  }
  for (const job of jobs) {
    await ensureRepo(job, login);
    pushJob(job);
  }

  const chartRoot = path.resolve(projectRoot, "../opensphere-chart");
  if (fs.existsSync(chartRoot)) {
    const chartJob = {
      name: "chart",
      description: "OpenSphere chart framework and gallery",
      homepage: "https://chart.opl.io.kr",
      skipCreate: false,
      deleteSourceRepo: `${sourceOwner}/opensphere-chart`,
      sourceDir: chartRoot,
      catalog: "",
      extraDeletes: [],
    };
    await ensureRepo(chartJob, login);
    const workRoot = path.join(os.tmpdir(), "opensphere-dest-chart");
    fs.rmSync(workRoot, { recursive: true, force: true });
    run("git", ["clone", "--depth", "1", `https://github.com/${destOwner}/chart.git`, workRoot], {
      silent: true,
      env: gitEnv(),
    });
    // 차트는 소스 트리를 그대로 밀어 넣는다
    for (const name of fs.readdirSync(workRoot)) {
      if (name === ".git") continue;
      fs.rmSync(path.join(workRoot, name), { recursive: true, force: true });
    }
    run("rsync", ["-a", "--exclude", ".git", `${chartRoot}/`, `${workRoot}/`]);
    run("git", ["-C", workRoot, "add", "-A"]);
    const status = run("git", ["-C", workRoot, "status", "--porcelain"], { silent: true });
    if (status.trim()) {
      run("git", [
        "-C",
        workRoot,
        "-c",
        "user.name=openplatform-labs",
        "-c",
        "user.email=openplatform-labs@users.noreply.github.com",
        "commit",
        "-m",
        "opensphere-chart 를 openplatform-labs/chart 로 이전",
      ]);
      run("git", ["-C", workRoot, "-c", "credential.helper=", "push", "origin", `HEAD:${branch}`], {
        env: gitEnv(),
      });
    }
    console.log("push 완료: https://github.com/openplatform-labs/chart");
    await deleteSource(chartJob);
  }

  for (const job of jobs) {
    await deleteSource(job);
  }
}

await main();
