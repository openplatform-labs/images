import { NextResponse } from "next/server";
import { isGitHubConfigured } from "@/lib/github";
import { config, isSmtpConfigured } from "@/lib/config";
import { verifySmtpConnection } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  const smtpConfigured = isSmtpConfigured();
  const smtpVerified = smtpConfigured ? await verifySmtpConnection() : false;

  return NextResponse.json({
    githubConfigured: isGitHubConfigured(),
    smtpConfigured,
    smtpVerified,
    repository: `${config.githubOwner}/${config.githubRepo}`,
    branch: config.githubBranch,
    staticallyCdnBase: `${config.staticallyCdnBase}/logos/`,
  });
}
