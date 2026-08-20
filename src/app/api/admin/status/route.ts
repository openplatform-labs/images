import { NextResponse } from "next/server";
import { isGitHubConfigured } from "@/lib/github";
import { isSmtpConfigured } from "@/lib/config";
import { verifySmtpConnection } from "@/lib/email";
import { isOktaConfigured } from "@/lib/okta";
import { getChannelCdnBase, getChannelGithub } from "@/lib/channel";
import { getRequestChannel } from "@/lib/request-channel";

export const runtime = "nodejs";

export async function GET() {
  const smtpConfigured = isSmtpConfigured();
  const smtpVerified = smtpConfigured ? await verifySmtpConnection() : false;
  const channelId = await getRequestChannel();
  const github = getChannelGithub(channelId);
  const channelCdn = getChannelCdnBase(channelId);

  return NextResponse.json({
    githubConfigured: isGitHubConfigured(),
    smtpConfigured,
    smtpVerified,
    oktaConfigured: isOktaConfigured(),
    repository: `${github.owner}/${github.repo}`,
    branch: github.branch,
    staticallyCdnBase: `${channelCdn}/`,
  });
}
