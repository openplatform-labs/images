/** AI·검색용 별칭 → shortname 매핑 */
const logoAliases: Record<string, string> = {
  k8s: "kubernetes",
  kube: "kubernetes",
  reactjs: "react",
  "react-js": "react",
  vuejs: "vue",
  vue3: "vue",
  nodejs: "nodejs",
  node: "nodejs",
  golang: "go",
  postgres: "postgresql",
  psql: "postgresql",
  pg: "postgresql",
  aws: "aws",
  gcp: "google-cloud",
  gh: "github",
  npmjs: "npm",
  ts: "typescript",
  js: "javascript",
  py: "python",
  csharp: "dotnet",
  "c#": "dotnet",
  nextjs: "nextjs",
  nuxtjs: "nuxt",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  docker: "docker",
  openai: "openai",
  chatgpt: "openai",
  gpt: "openai",
};

/** 쿼리 정규화 */
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

/** 별칭으로 shortname 조회 */
export function resolveAlias(query: string): string | null {
  const normalized = normalizeSearchQuery(query);
  return logoAliases[normalized] ?? null;
}
