import { Octokit } from "@octokit/rest";
import { config } from "./config";
import type { LogosJsonEntry } from "./types";

function createOctokit(): Octokit {
  if (!config.githubToken) {
    throw new Error("GITHUB_TOKEN 환경 변수가 설정되지 않았습니다.");
  }
  return new Octokit({ auth: config.githubToken });
}

export function isGitHubConfigured(): boolean {
  return Boolean(config.githubToken);
}

export async function fetchLogosJsonFromGitHub(): Promise<LogosJsonEntry[]> {
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

  const content = Buffer.from(response.data.content, "base64").toString("utf-8");
  return JSON.parse(content) as LogosJsonEntry[];
}

/** SVG 파일 + logos.json을 단일 커밋으로 GitHub에 반영 */
export async function uploadLogoToGitHub(params: {
  shortname: string;
  name: string;
  url: string;
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
  const newEntry: LogosJsonEntry = { name, shortname, url, files: fileNames };

  if (existingIndex >= 0) {
    const mergedFiles = Array.from(
      new Set([...logosJson[existingIndex].files, ...fileNames]),
    );
    logosJson[existingIndex] = { ...newEntry, files: mergedFiles };
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

  const finalFiles =
    existingIndex >= 0
      ? Array.from(new Set([...logosJson[existingIndex].files]))
      : fileNames;

  return {
    commitSha: commit.data.sha,
    fileNames: finalFiles,
  };
}
