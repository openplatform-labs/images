/** SVG 브랜드/베이스 컬러 감지·치환 (unDraw 스타일 일러스트용) */

const KNOWN_BASE_COLORS = [
  "#6c63ff",
  "#6366f1",
  "#e24a2b",
  "#ff6b4a",
  "#0f766e",
  "#14b8a6",
  "#1d4ed8",
  "#3b82f6",
  "#7c3aed",
  "#a855f7",
  "#db2777",
  "#ea580c",
  "#f59e0b",
];

const ILLUST_BASE_PRESETS = [
  { id: "seal", label: "Seal", hex: "#e24a2b" },
  { id: "undraw", label: "unDraw", hex: "#6c63ff" },
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "blue", label: "Blue", hex: "#1d4ed8" },
  { id: "violet", label: "Violet", hex: "#7c3aed" },
  { id: "pink", label: "Pink", hex: "#db2777" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
  { id: "ink", label: "Ink", hex: "#090814" },
] as const;

export { ILLUST_BASE_PRESETS };

/** #rgb / #rrggbb → #rrggbb 소문자 */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^#([0-9a-fA-F]{3})$/);
  if (shortMatch) {
    const [red, green, blue] = shortMatch[1].split("");
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }
  const longMatch = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (longMatch) return `#${longMatch[1]}`.toLowerCase();
  return null;
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

/** 무채색·피부톤에 가까운 색은 베이스 후보에서 제외 */
function isChromaticBrandCandidate(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const { red, green, blue } = rgb;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  // 거의 회색
  if (delta < 28) return false;
  // 거의 검정/흰색
  if (max < 40 || min > 235) return false;
  // 연한 피부톤 대역 완화 제외
  if (red > 180 && green > 140 && blue > 130 && red - blue < 80) return false;
  return true;
}

/** SVG에서 등장 빈도 기준 베이스 컬러 추정 */
export function detectSvgBaseColor(svg: string): string {
  const counts = new Map<string, number>();
  const matches = svg.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g);
  for (const match of matches) {
    const normalized = normalizeHexColor(`#${match[1]}`);
    if (!normalized || !isChromaticBrandCandidate(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  for (const known of KNOWN_BASE_COLORS) {
    const normalized = normalizeHexColor(known);
    if (normalized && counts.has(normalized)) return normalized;
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex;
      bestCount = count;
    }
  }
  return best ?? "#e24a2b";
}

/** fromHex(+알려진 베이스들)를 toHex로 일괄 치환 */
export function applySvgBaseColor(svg: string, toHexInput: string): string {
  const toHex = normalizeHexColor(toHexInput);
  if (!toHex) throw new Error("올바른 hex 색상(#RRGGBB)이 필요합니다.");

  const detected = detectSvgBaseColor(svg);
  const replaceSet = new Set<string>([
    detected,
    ...KNOWN_BASE_COLORS.map((hex) => normalizeHexColor(hex)!).filter(Boolean),
  ]);

  let result = svg;
  for (const fromHex of replaceSet) {
    if (!fromHex || fromHex === toHex) continue;
    result = result.replace(
      new RegExp(fromHex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      toHex,
    );
  }
  return result;
}
