import fs from "fs";
import { Octokit } from "@octokit/rest";
import { config, getLogosJsonRemoteUrl } from "./config";
import { normalizeLogosJsonFiles, sourceForCollection } from "./collection";
import type { LogoCollection, LogosJsonEntry } from "./types";

function createOctokit(): Octokit {
  if (!config.githubToken) {
    throw new Error("GITHUB_TOKEN 환경 변수가 설정되지 않았습니다.");
  }
  return new Octokit({ auth: config.githubToken });
}

export function isGitHubConfigured(): boolean {
  return Boolean(config.githubToken);
}

function getLocalLogosJsonPath(): string | null {
  if (config.logosJsonPath) return config.logosJsonPath;
  const defaultPath = `${process.cwd()}/logos.json`;
  return fs.existsSync(defaultPath) ? defaultPath : null;
}

function writeLogosJsonLocally(logosJson: LogosJsonEntry[]): void {
  const targetPath = getLocalLogosJsonPath();
  if (!targetPath) return;
  fs.writeFileSync(targetPath, JSON.stringify(logosJson, null, 2) + "\n");
}

/** GitHub 또는 로컬 logos.json 로드 */
export async function fetchLogosJsonFromGitHub(): Promise<LogosJsonEntry[]> {
  const localPath = getLocalLogosJsonPath();
  if (localPath) {
    const raw = fs.readFileSync(localPath, "utf-8");
    if (!raw.trim()) {
      throw new Error("로컬 logos.json 내용이 비어 있습니다.");
    }
    return JSON.parse(raw) as LogosJsonEntry[];
  }

  const octokit = createOctokit();
  const response = await octokit.repos.getContent({
    owner: config.githubOwner,
    repo: config.githubRepo,
    path: "logos.json",
    ref: config.githubBranch,
  });

  if (Array.isArray(response.data) || response.data.type !== "file") {
    throw new Error("logos.json 파일을 찾을 수 없습니다.");
  }

  let content = "";

  if ("content" in response.data && response.data.content) {
    content = Buffer.from(response.data.content, "base64").toString("utf-8");
  }

  // 1MB 이상이면 Contents API content 필드가 비어 있음
  if (!content.trim()) {
    const rawResponse = await fetch(getLogosJsonRemoteUrl(), {
      headers: config.githubToken
        ? { Authorization: `Bearer ${config.githubToken}` }
        : undefined,
    });

    if (!rawResponse.ok) {
      throw new Error(`logos.json raw 조회 실패: ${rawResponse.status}`);
    }

    content = await rawResponse.text();
  }

  if (!content.trim()) {
    throw new Error("logos.json 내용이 비어 있습니다.");
  }

  return JSON.parse(content) as LogosJsonEntry[];
}

/** SVG 파일 + logos.json을 단일 커밋으로 GitHub에 반영 */
export async function uploadLogoToGitHub(params: {
  shortname: string;
  name: string;
  url: string;
  collection?: LogoCollection;
  files: { filename: string; content: string }[];
}): Promise<{ commitSha: string; fileNames: string[] }> {
  const octokit = createOctokit();
  const { shortname, name, url, files } = params;
  const { githubOwner, githubRepo, githubBranch } = config;

  const logosJson = await fetchLogosJsonFromGitHub();
  const existingIndex = logosJson.findIndex(
    (entry) => entry.shortname === shortname,
  );

  const fileNames = files.map((file) => file.filename);
  const existingEntry = existingIndex >= 0 ? logosJson[existingIndex] : null;
  const collection =
    params.collection ?? existingEntry?.collection ?? "simple";
  const source = sourceForCollection(collection, existingEntry?.source);
  const mergedFilenames =
    existingIndex >= 0
      ? Array.from(
          new Set([
            ...existingEntry!.files.map((file) =>
              typeof file === "string" ? file : file.filename,
            ),
            ...fileNames,
          ]),
        )
      : fileNames;

  const newEntry: LogosJsonEntry = {
    name,
    shortname,
    url,
    collection,
    source,
    files: normalizeLogosJsonFiles(mergedFilenames, shortname, collection),
  };

  if (existingIndex >= 0) {
    logosJson[existingIndex] = newEntry;
  } else {
    logosJson.push(newEntry);
  }

  logosJson.sort((left, right) => left.name.localeCompare(right.name));

  const refResponse = await octokit.git.getRef({
    owner: githubOwner,
    repo: githubRepo,
    ref: `heads/${githubBranch}`,
  });
  const parentSha = refResponse.data.object.sha;

  const parentCommit = await octokit.git.getCommit({
    owner: githubOwner,
    repo: githubRepo,
    commit_sha: parentSha,
  });

  const treeItems: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }[] = [];

  for (const file of files) {
    const blob = await octokit.git.createBlob({
      owner: githubOwner,
      repo: githubRepo,
      content: Buffer.from(file.content, "utf-8").toString("base64"),
      encoding: "base64",
    });

    treeItems.push({
      path: `logos/${file.filename}`,
      mode: "100644",
      type: "blob",
      sha: blob.data.sha as string,
    });
  }

  const logosJsonBlob = await octokit.git.createBlob({
    owner: githubOwner,
    repo: githubRepo,
    content: Buffer.from(JSON.stringify(logosJson, null, 2) + "\n").toString(
      "base64",
    ),
    encoding: "base64",
  });

  treeItems.push({
    path: "logos.json",
    mode: "100644",
    type: "blob",
    sha: logosJsonBlob.data.sha as string,
  });

  const tree = await octokit.git.createTree({
    owner: githubOwner,
    repo: githubRepo,
    base_tree: parentCommit.data.tree.sha,
    tree: treeItems,
  });

  const commit = await octokit.git.createCommit({
    owner: githubOwner,
    repo: githubRepo,
    message: `${existingIndex >= 0 ? "Update" : "Add"} logo: ${name}`,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner: githubOwner,
    repo: githubRepo,
    ref: `heads/${githubBranch}`,
    sha: commit.data.sha,
  });

  writeLogosJsonLocally(logosJson);

  const finalFiles = mergedFilenames;

  return {
    commitSha: commit.data.sha,
    fileNames: finalFiles,
  };
}

/** logos.json 항목 메타데이터만 GitHub에 반영 */
export async function updateLogoMetadataOnGitHub(params: {
  shortname: string;
  name: string;
  url: string;
  collection?: LogoCollection;
}): Promise<{ commitSha: string }> {
  const octokit = createOctokit();
  const { shortname, name, url } = params;
  const { githubOwner, githubRepo, githubBranch } = config;

  const logosJson = await fetchLogosJsonFromGitHub();
  const existingIndex = logosJson.findIndex(
    (entry) => entry.shortname === shortname,
  );

  if (existingIndex < 0) {
    throw new Error(`logos.json에 '${shortname}' 항목이 없습니다.`);
  }

  const existingEntry = logosJson[existingIndex];
  const collection = params.collection ?? existingEntry.collection ?? "simple";
  const source = sourceForCollection(collection, existingEntry.source);
  const filenames = existingEntry.files.map((file) =>
    typeof file === "string" ? file : file.filename,
  );

  logosJson[existingIndex] = {
    ...existingEntry,
    name,
    url,
    collection,
    source,
    files: normalizeLogosJsonFiles(filenames, shortname, collection),
  };
  logosJson.sort((left, right) => left.name.localeCompare(right.name));

  const refResponse = await octokit.git.getRef({
    owner: githubOwner,
    repo: githubRepo,
    ref: `heads/${githubBranch}`,
  });
  const parentSha = refResponse.data.object.sha;

  const parentCommit = await octokit.git.getCommit({
    owner: githubOwner,
    repo: githubRepo,
    commit_sha: parentSha,
  });

  const logosJsonBlob = await octokit.git.createBlob({
    owner: githubOwner,
    repo: githubRepo,
    content: Buffer.from(JSON.stringify(logosJson, null, 2) + "\n").toString(
      "base64",
    ),
    encoding: "base64",
  });

  const tree = await octokit.git.createTree({
    owner: githubOwner,
    repo: githubRepo,
    base_tree: parentCommit.data.tree.sha,
    tree: [
      {
        path: "logos.json",
        mode: "100644",
        type: "blob",
        sha: logosJsonBlob.data.sha as string,
      },
    ],
  });

  const commit = await octokit.git.createCommit({
    owner: githubOwner,
    repo: githubRepo,
    message: `Update logo metadata: ${name}`,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner: githubOwner,
    repo: githubRepo,
    ref: `heads/${githubBranch}`,
    sha: commit.data.sha,
  });

  writeLogosJsonLocally(logosJson);

  return { commitSha: commit.data.sha };
}
