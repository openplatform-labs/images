import { NextResponse } from "next/server";
import {
  getLogoByShortname,
  updateLogoEntry,
  updateLogoMetadata,
  upsertLogoLocally,
} from "@/lib/catalog";
import {
  isGitHubConfigured,
  updateLogoMetadataOnGitHub,
} from "@/lib/github";
import { normalizeLogosJsonFiles, sourceForCollection } from "@/lib/collection";
import type { LogoCollection } from "@/lib/types";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getRequestChannelConfig } from "@/lib/request-channel";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  if (!isAuthorizedRequest(_request)) return unauthorizedResponse();

  const channel = await getRequestChannelConfig();
  const { shortname } = await context.params;
  const logo = getLogoByShortname(shortname, channel.id);

  if (!logo) {
    return NextResponse.json(
      { error: `${channel.itemLabelKo}를 찾을 수 없습니다.` },
      { status: 404 },
    );
  }

  return NextResponse.json(logo);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const channel = await getRequestChannelConfig();
  const { shortname } = await context.params;
  const existing = getLogoByShortname(shortname, channel.id);

  if (!existing) {
    return NextResponse.json(
      { error: `${channel.itemLabelKo}를 찾을 수 없습니다.` },
      { status: 404 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    url?: string;
    collection?: LogoCollection;
    categoryIds?: number[];
    tagIds?: number[];
    previewFilename?: string | null;
    syncGithub?: boolean;
  };

  const name = body.name?.trim() ?? existing.name;
  const url = body.url?.trim() ?? existing.url ?? "";
  const collection = body.collection ?? existing.collection;
  const source =
    channel.id === "icons"
      ? (existing.source ?? "").trim()
      : sourceForCollection(collection, existing.source);
  const categoryIds = body.categoryIds ?? existing.categories.map((c) => c.id);
  const tagIds = body.tagIds ?? existing.tags.map((t) => t.id);
  const syncGithub = body.syncGithub !== false;
  const previewFilename =
    body.previewFilename !== undefined
      ? body.previewFilename
      : existing.previewFilename;

  if (
    previewFilename &&
    !existing.files.some((file) => file.filename === previewFilename)
  ) {
    return NextResponse.json(
      { error: `기본 이미지 파일 '${previewFilename}'을(를) 찾을 수 없습니다.` },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: `${channel.namePlaceholder}이(가) 필요합니다.` },
      { status: 400 },
    );
  }

  try {
    let commitSha: string | null = null;

    if (syncGithub) {
      if (!isGitHubConfigured()) {
        return NextResponse.json(
          { error: "GITHUB_TOKEN이 설정되지 않았습니다." },
          { status: 503 },
        );
      }

      const githubResult = await updateLogoMetadataOnGitHub({
        channelId: channel.id,
        shortname,
        name,
        url,
        collection,
        source: source ?? undefined,
        previewFilename,
        filenames: existing.files.map((file) => file.filename),
      });
      commitSha = githubResult.commitSha;
    }

    const normalizedFiles = normalizeLogosJsonFiles(
      existing.files.map((file) => file.filename),
      shortname,
      collection,
    );

    updateLogoEntry(
      shortname,
      { name, url, collection, source, previewFilename },
      channel.id,
    );
    updateLogoMetadata(shortname, categoryIds, tagIds);

    upsertLogoLocally(
      {
        shortname,
        name,
        url,
        collection,
        source,
        previewFilename: previewFilename ?? undefined,
        files: normalizedFiles,
      },
      channel.id,
    );

    const updated = getLogoByShortname(shortname, channel.id);

    return NextResponse.json({
      ok: true,
      commitSha,
      logo: updated,
      message: syncGithub
        ? `${channel.itemLabelKo} 정보가 SQLite와 GitHub ${channel.catalogFile}에 반영되었습니다.`
        : `${channel.itemLabelKo} 정보가 SQLite에 반영되었습니다.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
