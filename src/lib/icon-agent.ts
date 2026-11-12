import { getLogoByShortname, listIconPacks } from "./catalog";
import { iconImgSnippet, iconPackUsageNote } from "./icon-pack";
import { pickLogoFile } from "./logo-files";
import { searchLogosWithScore } from "./resolve";

export interface IconAgentHit {
  source: string | null;
  pack: string | null;
  shortname: string;
  name: string;
  url: string | null;
  usage: string | null;
  html: string | null;
}

function hitFromShortname(shortname: string, name: string): IconAgentHit | null {
  const logo = getLogoByShortname(shortname, "icons");
  if (!logo) return null;
  const file = pickLogoFile(logo.files, logo.shortname, logo.collection, "default");
  const url = file?.staticallyUrl ?? null;
  return {
    source: logo.source,
    pack: logo.source,
    shortname: logo.shortname,
    name: logo.name || name,
    url,
    usage: iconPackUsageNote(logo.source),
    html: url ? iconImgSnippet(url, logo.name || name) : null,
  };
}

/** list_packs — 갤러리와 같은 listIconPacks */
export function listIconPacksForAgent() {
  return listIconPacks("icons").map((pack) => ({
    slug: pack.slug,
    label: pack.label,
    count: pack.count,
    usage: iconPackUsageNote(pack.slug),
  }));
}

/** search_icons — resolve와 같은 점수 검색, source로 팩 제한 */
export function searchIconsForAgent(
  query: string,
  pack?: string,
  limit = 8,
): IconAgentHit[] {
  const capped = Math.min(Math.max(limit, 1), 20);
  return searchLogosWithScore(query, capped, undefined, "icons", pack).flatMap((row) => {
    const hit = hitFromShortname(row.shortname, row.name);
    return hit ? [hit] : [];
  });
}

/** get_icon — shortname 단건 */
export function getIconForAgent(shortname: string): IconAgentHit | null {
  const trimmed = shortname.trim();
  if (!trimmed) return null;
  return hitFromShortname(trimmed, trimmed);
}
