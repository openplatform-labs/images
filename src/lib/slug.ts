/** URL·식별자용 슬러그 생성 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[#\s]+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
