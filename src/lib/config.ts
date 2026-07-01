export const config = {
  githubOwner: process.env.GITHUB_OWNER ?? "opensphere-platform",
  githubRepo: process.env.GITHUB_REPO ?? "logos",
  githubBranch: process.env.GITHUB_BRANCH ?? "main",
  staticallyCdnBase:
    process.env.STATICALLY_CDN_BASE ??
    "https://cdn.statically.io/gh/opensphere-platform/logos@main",
  logosJsonPath: process.env.LOGOS_JSON_PATH,
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? "587"),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
  },
  sessionDays: Number(process.env.SESSION_DAYS ?? "7"),
  otpExpireMinutes: Number(process.env.OTP_EXPIRE_MINUTES ?? "10"),
  siteBaseUrl:
    process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://images.opl.io.kr",
};

export function getLogosJsonRemoteUrl(): string {
  const { githubOwner, githubRepo, githubBranch } = config;
  return `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/logos.json`;
}

export function getGithubRepoUrl(): string {
  const { githubOwner, githubRepo } = config;
  return `https://github.com/${githubOwner}/${githubRepo}`;
}

export function isSmtpConfigured(): boolean {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}
