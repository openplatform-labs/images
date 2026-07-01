import { config } from "./config";

/** Statically CDN URL 생성 */
export function buildStaticallyUrl(filename: string): string {
  const base = config.staticallyCdnBase.replace(/\/$/, "");
  return `${base}/logos/${filename}`;
}

/** GitHub blob URL → Statically CDN URL 변환 */
export function githubBlobToStatically(githubBlobUrl: string): string | null {
  const pattern =
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.svg)$/i;
  const match = githubBlobUrl.match(pattern);
  if (!match) return null;

  const [, owner, repo, branch, filePath] = match;
  return `https://cdn.statically.io/gh/${owner}/${repo}@${branch}/${filePath}`;
}
