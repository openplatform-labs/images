import {
  getChannelCdnBase,
  getChannelConfig,
  type ChannelId,
} from "./channel";

/** 항상 https:// CDN 절대경로만 반환 */
export function buildStaticallyUrl(
  filename: string,
  channelId: ChannelId = "logos",
): string {
  const base = getChannelCdnBase(channelId);
  const assetDir = getChannelConfig(channelId).assetDir;
  return `${base}/${assetDir}/${filename}`;
}

/** 복사·표시용 — 상대경로면 CDN 절대경로로 강제 변환 */
export function toAbsoluteCdnUrl(
  value: string,
  channelId: ChannelId = "logos",
): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("https://")) return trimmed;

  // /media/foo.jpg 또는 images/foo.jpg 또는 icons/pkg/foo.svg
  const filename = trimmed
    .replace(/^\/media\//, "")
    .replace(/^\/?(images|logos|illust|icons|avatars|pictograms)\//, "")
    .replace(/^\/+/, "");

  // icons 패키지 경로(lucide/home.svg)는 그대로 유지
  if (!filename) return buildStaticallyUrl("unknown", channelId);
  return buildStaticallyUrl(filename, channelId);
}

/** GitHub blob URL → Statically CDN URL 변환 */
export function githubBlobToStatically(githubBlobUrl: string): string | null {
  const pattern =
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i;
  const match = githubBlobUrl.match(pattern);
  if (!match) return null;

  const [, owner, repo, branch, filePath] = match;
  return `https://cdn.statically.io/gh/${owner}/${repo}@${branch}/${filePath}`;
}
