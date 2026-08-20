import { NextResponse } from "next/server";
import {
  deleteLogoLocally,
  getLogoByShortname,
  replaceLogoFilesLocally,
  updateLogoEntry,
  updateLogoMetadata,
  upsertLogoLocally,
} from "@/lib/catalog";
import { normalizeLogosJsonFiles, sourceForCollection } from "@/lib/collection";
import { isGitHubConfigured, mergeLogosOnGitHub } from "@/lib/github";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getRequestChannelConfig } from "@/lib/request-channel";
import type { LogoCollection } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const channel = await getRequestChannelConfig();
  if (channel.id !== "logos" && channel.id !== "illust" && channel.id !== "images") {
    return NextResponse.json(
      { error: "이 채널에서는 병합을 지원하지 않습니다." },
      { status: 400 },
    );
  }

  if (!isGitHubConfigured()) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    targetShortname?: string;
    sourceShortnames?: string[];
    name?: string;
    url?: string;
    collection?: LogoCollection;
    categoryIds?: number[];
    tagIds?: number[];
  };

  const targetShortname = body.targetShortname?.trim() ?? "";
  const sourceShortnames = Array.from(
    new Set(
      (body.sourceShortnames ?? [])
        .map((value) => value.trim())
        .filter((value) => value && value !== targetShortname),
    ),
  );

  if (!targetShortname || sourceShortnames.length === 0) {
    return NextResponse.json(
      { error: "targetShortname과 1개 이상의 sourceShortnames가 필요합니다." },
      { status: 400 },
    );
  }

  const target = getLogoByShortname(targetShortname, channel.id);
  if (!target) {
    return NextResponse.json(
      { error: `타깃 '${targetShortname}'을(를) 찾을 수 없습니다.` },
      { status: 404 },
    );
  }

  for (const sourceShortname of sourceShortnames) {
    const source = getLogoByShortname(sourceShortname, channel.id);
    if (!source) {
      return NextResponse.json(
        { error: `소스 '${sourceShortname}'을(를) 찾을 수 없습니다.` },
        { status: 404 },
      );
    }
  }

  try {
    const mergeResult = await mergeLogosOnGitHub({
      channelId: channel.id,
      targetShortname,
      sourceShortnames,
      name: body.name?.trim() || target.name,
      url: body.url?.trim() ?? target.url ?? "",
      collection: body.collection,
    });

    const collection = body.collection ??
      (mergeResult.fileNames.length > 2 ? "themed" : target.collection);
    const source = sourceForCollection(collection, target.source);
    const normalizedFiles = normalizeLogosJsonFiles(
      mergeResult.fileNames,
      targetShortname,
      collection,
    );

    updateLogoEntry(
      targetShortname,
      {
        name: body.name?.trim() || target.name,
        url: body.url?.trim() ?? target.url ?? "",
        collection,
        source,
      },
      channel.id,
    );
    replaceLogoFilesLocally(targetShortname, normalizedFiles, channel.id);
    upsertLogoLocally(
      {
        name: body.name?.trim() || target.name,
        shortname: targetShortname,
        url: body.url?.trim() ?? target.url ?? "",
        collection,
        source,
        files: normalizedFiles,
        previewFilename:
          target.previewFilename &&
          normalizedFiles.some(
            (file) =>
              (typeof file === "string" ? file : file.filename) ===
              target.previewFilename,
          )
            ? target.previewFilename
            : undefined,
      },
      channel.id,
    );

    const categoryIds =
      body.categoryIds ?? target.categories.map((category) => category.id);
    const tagIds = body.tagIds ?? target.tags.map((tag) => tag.id);
    updateLogoMetadata(targetShortname, categoryIds, tagIds);

    for (const sourceShortname of mergeResult.removedShortnames) {
      deleteLogoLocally(sourceShortname, channel.id);
    }

    const updated = getLogoByShortname(targetShortname, channel.id);

    return NextResponse.json({
      ok: true,
      commitSha: mergeResult.commitSha,
      targetShortname,
      removedShortnames: mergeResult.removedShortnames,
      moved: mergeResult.moved,
      logo: updated,
      message: `${mergeResult.removedShortnames.length}개 항목을 '${targetShortname}'으로 병합했습니다.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "병합 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
