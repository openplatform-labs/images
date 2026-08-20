import fs from "fs";
import path from "path";
import { Octokit } from "@octokit/rest";
import { config } from "./config";
import {
  buildIconAssetPath,
  getCatalogRemoteUrl,
  getChannelConfig,
  getChannelGithub,
  type ChannelId,
} from "./channel";
import { normalizeLogosJsonFiles, sourceForCollection } from "./collection";
import { remapMergedFilename } from "./filename";
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

function getLocalCatalogPath(channelId: ChannelId): string | null {
  const channel = getChannelConfig(channelId);
  if (channelId === "logos" && config.logosJsonPath) {
    return config.logosJsonPath;
  }
  const defaultPath = path.join(process.cwd(), channel.catalogFile);
  return fs.existsSync(defaultPath) ? defaultPath : null;
}

function writeCatalogLocally(
  channelId: ChannelId,
  catalog: LogosJsonEntry[],
): void {
  const targetPath = getLocalCatalogPath(channelId);
  if (!targetPath) return;
  fs.writeFileSync(targetPath, JSON.stringify(catalog, null, 2) + "\n");
}

/** GitHub 또는 로컬 채널 카탈로그 로드 */
export async function fetchCatalogFromGitHub(
  channelId: ChannelId = "logos",
): Promise<LogosJsonEntry[]> {
  const channel = getChannelConfig(channelId);
  const localPath = getLocalCatalogPath(channelId);
  if (localPath) {
    const raw = fs.readFileSync(localPath, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as LogosJsonEntry[];
  }

  const octokit = createOctokit();
  const { owner, repo, branch } = getChannelGithub(channelId);
  const response = await octokit.repos.getContent({
    owner,
    repo,
    path: channel.catalogFile,
    ref: branch,
  });

  if (Array.isArray(response.data) || response.data.type !== "file") {
    // 카탈로그가 없으면 빈 배열로 시작
    return [];
  }

  let content = "";

  if ("content" in response.data && response.data.content) {
    content = Buffer.from(response.data.content, "base64").toString("utf-8");
  }

  if (!content.trim()) {
    const rawResponse = await fetch(getCatalogRemoteUrl(channelId), {
      headers: config.githubToken
        ? { Authorization: `Bearer ${config.githubToken}` }
        : undefined,
    });

    if (rawResponse.status === 404) return [];
    if (!rawResponse.ok) {
      throw new Error(`${channel.catalogFile} raw 조회 실패: ${rawResponse.status}`);
    }

    content = await rawResponse.text();
  }

  if (!content.trim()) return [];
  return JSON.parse(content) as LogosJsonEntry[];
}

/** @deprecated logos 전용 호환 — fetchCatalogFromGitHub 사용 */
export async function fetchLogosJsonFromGitHub(): Promise<LogosJsonEntry[]> {
  return fetchCatalogFromGitHub("logos");
}

function resolveAssetRelativePath(params: {
  channelId: ChannelId;
  filename: string;
  packageSlug?: string;
}): string {
  const channel = getChannelConfig(params.channelId);
  if (params.channelId === "icons" && params.packageSlug) {
    return `${channel.assetDir}/${buildIconAssetPath(params.packageSlug, params.filename)}`;
  }
  return `${channel.assetDir}/${params.filename}`;
}

function resolveCatalogFilename(params: {
  channelId: ChannelId;
  filename: string;
  packageSlug?: string;
}): string {
  if (params.channelId === "icons" && params.packageSlug) {
    return buildIconAssetPath(params.packageSlug, params.filename);
  }
  return params.filename;
}

/** 자산 파일 + 채널 카탈로그를 단일 커밋으로 GitHub에 반영 */
export async function uploadLogoToGitHub(params: {
  channelId?: ChannelId;
  shortname: string;
  name: string;
  url: string;
  collection?: LogoCollection;
  source?: string;
  packageSlug?: string;
  files: {
    filename: string;
    content: string;
    encoding?: "utf-8" | "base64";
  }[];
}): Promise<{ commitSha: string; fileNames: string[] }> {
  const channelId = params.channelId ?? "logos";
  const channel = getChannelConfig(channelId);
  const octokit = createOctokit();
  const { shortname, name, url, files } = params;
  const { owner, repo, branch } = getChannelGithub(channelId);
  const packageSlug =
    channelId === "icons"
      ? (params.packageSlug ?? params.source ?? "").trim()
      : undefined;

  if (channelId === "icons" && !packageSlug) {
    throw new Error("아이콘은 package(패키지 slug)가 필요합니다.");
  }

  const catalog = await fetchCatalogFromGitHub(channelId);
  const existingIndex = catalog.findIndex(
    (entry) => entry.shortname === shortname,
  );

  const catalogFilenames = files.map((file) =>
    resolveCatalogFilename({
      channelId,
      filename: file.filename,
      packageSlug,
    }),
  );
  const existingEntry = existingIndex >= 0 ? catalog[existingIndex] : null;
  const collection =
    params.collection ?? existingEntry?.collection ?? "simple";
  const source =
    channelId === "icons"
      ? packageSlug!
      : sourceForCollection(collection, params.source ?? existingEntry?.source);
  const mergedFilenames =
    existingIndex >= 0
      ? Array.from(
          new Set([
            ...existingEntry!.files.map((file) =>
              typeof file === "string" ? file : file.filename,
            ),
            ...catalogFilenames,
          ]),
        )
      : catalogFilenames;

  const newEntry: LogosJsonEntry = {
    name,
    shortname,
    url,
    collection,
    source,
    files: normalizeLogosJsonFiles(mergedFilenames, shortname, collection),
  };
  // 기존 기본 이미지가 여전히 파일 목록에 있으면 유지
  if (
    existingEntry?.previewFilename &&
    mergedFilenames.includes(existingEntry.previewFilename)
  ) {
    newEntry.previewFilename = existingEntry.previewFilename;
  }

  if (existingIndex >= 0) {
    catalog[existingIndex] = newEntry;
  } else {
    catalog.push(newEntry);
  }

  catalog.sort((left, right) => left.name.localeCompare(right.name));

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

  const treeItems: {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }[] = [];

  for (const file of files) {
    const blobContent =
      file.encoding === "base64"
        ? file.content.replace(/\s+/g, "")
        : Buffer.from(file.content, "utf-8").toString("base64");
    const blob = await octokit.git.createBlob({
      owner,
      repo,
      content: blobContent,
      encoding: "base64",
    });

    treeItems.push({
      path: resolveAssetRelativePath({
        channelId,
        filename: file.filename,
        packageSlug,
      }),
      mode: "100644",
      type: "blob",
      sha: blob.data.sha as string,
    });
  }

  const catalogBlob = await octokit.git.createBlob({
    owner,
    repo,
    content: Buffer.from(JSON.stringify(catalog, null, 2) + "\n").toString(
      "base64",
    ),
    encoding: "base64",
  });

  treeItems.push({
    path: channel.catalogFile,
    mode: "100644",
    type: "blob",
    sha: catalogBlob.data.sha as string,
  });

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.data.tree.sha,
    tree: treeItems,
  });

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: `${existingIndex >= 0 ? "Update" : "Add"} ${channel.itemLabel}: ${name}${
      packageSlug ? ` (${packageSlug})` : ""
    }`,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
  });

  writeCatalogLocally(channelId, catalog);

  return {
    commitSha: commit.data.sha,
    fileNames: mergedFilenames,
  };
}

/** 채널 카탈로그 항목 메타데이터만 GitHub에 반영 (없으면 SQLite 파일 목록으로 복구 생성) */
export async function updateLogoMetadataOnGitHub(params: {
  channelId?: ChannelId;
  shortname: string;
  name: string;
  url: string;
  collection?: LogoCollection;
  source?: string;
  previewFilename?: string | null;
  /** 카탈로그에 없을 때 복구용 파일명 (SQLite 기준) */
  filenames?: string[];
}): Promise<{ commitSha: string }> {
  const channelId = params.channelId ?? "logos";
  const channel = getChannelConfig(channelId);
  const octokit = createOctokit();
  const { shortname, name, url } = params;
  const { owner, repo, branch } = getChannelGithub(channelId);

  const catalog = await fetchCatalogFromGitHub(channelId);
  const existingIndex = catalog.findIndex(
    (entry) => entry.shortname === shortname,
  );

  const existingEntry = existingIndex >= 0 ? catalog[existingIndex] : null;
  const collection =
    params.collection ?? existingEntry?.collection ?? "simple";
  const source =
    channelId === "icons"
      ? (params.source ?? existingEntry?.source ?? "").trim() ||
        existingEntry?.source
      : sourceForCollection(collection, params.source ?? existingEntry?.source);

  const filenames =
    existingEntry?.files.map((file) =>
      typeof file === "string" ? file : file.filename,
    ) ??
    params.filenames ??
    [];

  // 이사·분실로 카탈로그만 비어 있으면 SQLite 파일 목록으로 항목을 다시 만든다
  if (existingIndex < 0 && filenames.length === 0) {
    throw new Error(
      `${channel.catalogFile}에 '${shortname}' 항목이 없고 복구할 파일도 없습니다. SVG를 추가한 뒤 한 번에 저장하세요.`,
    );
  }

  const previewFilename =
    params.previewFilename !== undefined
      ? params.previewFilename
      : (existingEntry?.previewFilename ?? null);

  const newEntry: LogosJsonEntry = {
    ...(existingEntry ?? {}),
    name,
    shortname,
    url,
    collection,
    source,
    files: normalizeLogosJsonFiles(filenames, shortname, collection),
  };
  if (previewFilename) {
    newEntry.previewFilename = previewFilename;
  } else {
    delete newEntry.previewFilename;
  }

  if (existingIndex >= 0) {
    catalog[existingIndex] = newEntry;
  } else {
    catalog.push(newEntry);
  }
  catalog.sort((left, right) => left.name.localeCompare(right.name));

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

  const catalogBlob = await octokit.git.createBlob({
    owner,
    repo,
    content: Buffer.from(JSON.stringify(catalog, null, 2) + "\n").toString(
      "base64",
    ),
    encoding: "base64",
  });

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.data.tree.sha,
    tree: [
      {
        path: channel.catalogFile,
        mode: "100644",
        type: "blob",
        sha: catalogBlob.data.sha as string,
      },
    ],
  });

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message:
      existingIndex >= 0
        ? `Update ${channel.itemLabel} metadata: ${name}`
        : `Restore ${channel.itemLabel} catalog entry: ${name}`,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
  });

  writeCatalogLocally(channelId, catalog);

  return { commitSha: commit.data.sha };
}

/** 여러 shortname 로고를 하나로 병합 (파일 이동 + 카탈로그/원본 정리) */
export async function mergeLogosOnGitHub(params: {
  channelId?: ChannelId;
  targetShortname: string;
  sourceShortnames: string[];
  name?: string;
  url?: string;
  collection?: LogoCollection;
}): Promise<{
  commitSha: string;
  targetShortname: string;
  fileNames: string[];
  moved: { from: string; to: string; sourceShortname: string }[];
  removedShortnames: string[];
}> {
  const channelId = params.channelId ?? "logos";
  const channel = getChannelConfig(channelId);
  const octokit = createOctokit();
  const { owner, repo, branch } = getChannelGithub(channelId);
  const targetShortname = params.targetShortname;
  const sourceShortnames = Array.from(
    new Set(params.sourceShortnames.filter((value) => value !== targetShortname)),
  );

  if (sourceShortnames.length === 0) {
    throw new Error("병합할 소스 shortname이 필요합니다.");
  }

  const catalog = await fetchCatalogFromGitHub(channelId);
  const targetEntry = catalog.find((entry) => entry.shortname === targetShortname);
  if (!targetEntry) {
    throw new Error(`${channel.catalogFile}에 '${targetShortname}' 항목이 없습니다.`);
  }

  const sourceEntries = sourceShortnames.map((shortname) => {
    const entry = catalog.find((item) => item.shortname === shortname);
    if (!entry) {
      throw new Error(`${channel.catalogFile}에 '${shortname}' 항목이 없습니다.`);
    }
    return entry;
  });

  const totalFileCount =
    (targetEntry.files?.length ?? 0) +
    sourceEntries.reduce((sum, entry) => sum + (entry.files?.length ?? 0), 0);
  const collection: LogoCollection =
    params.collection ??
    (sourceEntries.some((entry) => entry.collection === "themed") ||
    targetEntry.collection === "themed" ||
    totalFileCount > 1
      ? "themed"
      : "simple");

  const usedLowerNames = new Set<string>();
  const targetFilenames = (targetEntry.files ?? []).map((file) =>
    typeof file === "string" ? file : file.filename,
  );
  for (const filename of targetFilenames) {
    usedLowerNames.add(filename.toLowerCase());
  }

  type TreeItem = {
    path: string;
    mode: "100644";
    type: "blob";
    sha: string | null;
  };

  const treeItems: TreeItem[] = [];
  const moved: { from: string; to: string; sourceShortname: string }[] = [];
  const mergedFilenames = [...targetFilenames];

  for (const sourceEntry of sourceEntries) {
    const sourceFiles = (sourceEntry.files ?? []).map((file) =>
      typeof file === "string" ? file : file.filename,
    );

    for (const originalFilename of sourceFiles) {
      const assetPath = resolveAssetRelativePath({
        channelId,
        filename: originalFilename,
      });
      const contentResponse = await octokit.repos.getContent({
        owner,
        repo,
        path: assetPath,
        ref: branch,
      });
      if (Array.isArray(contentResponse.data) || contentResponse.data.type !== "file") {
        throw new Error(`파일을 읽을 수 없습니다: ${assetPath}`);
      }
      if (!("content" in contentResponse.data) || !contentResponse.data.content) {
        throw new Error(`파일 내용이 비어 있습니다: ${assetPath}`);
      }

      const nextFilename = remapMergedFilename(
        originalFilename,
        sourceEntry.shortname,
        targetShortname,
        usedLowerNames,
      );
      const nextPath = resolveAssetRelativePath({
        channelId,
        filename: nextFilename,
      });

      // 같은 경로면 blob 재사용, 아니면 새 blob
      if (nextFilename === originalFilename) {
        mergedFilenames.push(nextFilename);
        moved.push({
          from: originalFilename,
          to: nextFilename,
          sourceShortname: sourceEntry.shortname,
        });
        continue;
      }

      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: contentResponse.data.content.replace(/\s+/g, ""),
        encoding: "base64",
      });
      treeItems.push({
        path: nextPath,
        mode: "100644",
        type: "blob",
        sha: blob.data.sha as string,
      });
      // 원본 경로 삭제
      treeItems.push({
        path: assetPath,
        mode: "100644",
        type: "blob",
        sha: null,
      });
      mergedFilenames.push(nextFilename);
      moved.push({
        from: originalFilename,
        to: nextFilename,
        sourceShortname: sourceEntry.shortname,
      });
    }
  }

  const uniqueFilenames = Array.from(new Set(mergedFilenames));
  const source =
    channelId === "icons"
      ? (targetEntry.source ?? "").trim()
      : sourceForCollection(collection, targetEntry.source);

  const nextTarget: LogosJsonEntry = {
    name: params.name?.trim() || targetEntry.name,
    shortname: targetShortname,
    url: params.url?.trim() ?? targetEntry.url ?? "",
    collection,
    source,
    files: normalizeLogosJsonFiles(uniqueFilenames, targetShortname, collection),
  };
  // 대상에 지정된 기본 이미지가 병합 후에도 남아 있으면 유지
  if (
    targetEntry.previewFilename &&
    uniqueFilenames.includes(targetEntry.previewFilename)
  ) {
    nextTarget.previewFilename = targetEntry.previewFilename;
  }

  const nextCatalog = catalog
    .filter((entry) => !sourceShortnames.includes(entry.shortname))
    .map((entry) =>
      entry.shortname === targetShortname ? nextTarget : entry,
    );
  nextCatalog.sort((left, right) => left.name.localeCompare(right.name));

  const catalogBlob = await octokit.git.createBlob({
    owner,
    repo,
    content: Buffer.from(JSON.stringify(nextCatalog, null, 2) + "\n").toString(
      "base64",
    ),
    encoding: "base64",
  });
  treeItems.push({
    path: channel.catalogFile,
    mode: "100644",
    type: "blob",
    sha: catalogBlob.data.sha as string,
  });

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

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.data.tree.sha,
    tree: treeItems,
  });

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: `Merge ${channel.itemLabelPlural}: ${sourceShortnames.join(", ")} → ${targetShortname}`,
    tree: tree.data.sha,
    parents: [parentSha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
  });

  writeCatalogLocally(channelId, nextCatalog);

  return {
    commitSha: commit.data.sha,
    targetShortname,
    fileNames: uniqueFilenames,
    moved,
    removedShortnames: sourceShortnames,
  };
}
