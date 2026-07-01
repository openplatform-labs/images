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

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  if (!isAuthorizedRequest(_request)) return unauthorizedResponse();

  const { shortname } = await context.params;
  const logo = getLogoByShortname(shortname);

  if (!logo) {
    return NextResponse.json({ error: "로고를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(logo);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ shortname: string }> },
) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const { shortname } = await context.params;
  const existing = getLogoByShortname(shortname);

  if (!existing) {
    return NextResponse.json({ error: "로고를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    url?: string;
    collection?: LogoCollection;
    categoryIds?: number[];
    tagIds?: number[];
    syncGithub?: boolean;
  };

  const name = body.name?.trim() ?? existing.name;
  const url = body.url?.trim() ?? existing.url ?? "";
  const collection = body.collection ?? existing.collection;
  const source = sourceForCollection(collection, existing.source);
  const categoryIds = body.categoryIds ?? existing.categories.map((c) => c.id);
  const tagIds = body.tagIds ?? existing.tags.map((t) => t.id);
  const syncGithub = body.syncGithub !== false;

  if (!name) {
    return NextResponse.json({ error: "브랜드명이 필요합니다." }, { status: 400 });
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
        shortname,
        name,
        url,
        collection,
      });
      commitSha = githubResult.commitSha;
    }

    const normalizedFiles = normalizeLogosJsonFiles(
      existing.files.map((file) => file.filename),
      shortname,
      collection,
    );

    updateLogoEntry(shortname, { name, url, collection, source });
    updateLogoMetadata(shortname, categoryIds, tagIds);

    upsertLogoLocally({
      shortname,
      name,
      url,
      collection,
      source,
      files: normalizedFiles,
    });

    const updated = getLogoByShortname(shortname);

    return NextResponse.json({
      ok: true,
      commitSha,
      logo: updated,
      message: syncGithub
        ? "로고 정보가 SQLite와 GitHub logos.json에 반영되었습니다."
        : "로고 정보가 SQLite에 반영되었습니다.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
