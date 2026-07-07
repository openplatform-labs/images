export const config = {
  githubOwner: process.env.GITHUB_OWNER ?? "openplatform-labs",
  githubRepo: process.env.GITHUB_REPO ?? "images",
  githubBranch: process.env.GITHUB_BRANCH ?? "main",
  staticallyCdnBase:
    process.env.STATICALLY_CDN_BASE ??
    "https://cdn.statically.io/gh/openplatform-labs/images@main",
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
  sessionHours: Number(process.env.SESSION_HOURS ?? "1"),
  otpExpireMinutes: Number(process.env.OTP_EXPIRE_MINUTES ?? "10"),
  siteBaseUrl:
    process.env.SITE_BASE_URL?.replace(/\/$/, "") ?? "https://logos.opl.io.kr",
  okta: {
    clientId: process.env.OKTA_CLIENT_ID ?? "",
    clientSecret: process.env.OKTA_CLIENT_SECRET ?? "",
    authorizeUrl:
      process.env.OKTA_AUTHORIZE_URL ??
      "https://integrator-1653288.okta.com/oauth2/default/v1/authorize",
    tokenUrl:
      process.env.OKTA_TOKEN_URL ??
      "https://integrator-1653288.okta.com/oauth2/default/v1/token",
    userinfoUrl:
      process.env.OKTA_USERINFO_URL ??
      "https://integrator-1653288.okta.com/oauth2/default/v1/userinfo",
    jwksUrl:
      process.env.OKTA_JWKS_URL ??
      "https://integrator-1653288.okta.com/oauth2/default/v1/keys",
    logoutUrl:
      process.env.OKTA_LOGOUT_URL ??
      "https://integrator-1653288.okta.com/oauth2/default/v1/logout",
    scopes: process.env.OKTA_SCOPES ?? "openid profile email",
  },
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
