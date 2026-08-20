import { NextResponse } from "next/server";
import {
  getLogoByShortname,
  updateLogoMetadata,
  upsertLogoLocally,
} from "@/lib/catalog";
import { parseCollectionInput, sourceForCollection } from "@/lib/collection";
import { isGitHubConfigured, uploadLogoToGitHub } from "@/lib/github";
import { buildStaticallyUrl } from "@/lib/statically";
import { inferLogoMetaFromFilename, normalizeAssetFilename } from "@/lib/filename";
import { slugify } from "@/lib/slug";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { getRequestChannelConfig } from "@/lib/request-channel";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

  const channel = await getRequestChannelConfig();

  if (!isGitHubConfigured()) {
    return NextResponse.json(
      {
        error:
          "GITHUB_TOKEN이 설정되지 않았습니다. .env.local에 토큰을 추가한 뒤 서버를 재시작하세요.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  let shortname = String(formData.get("shortname") ?? "").trim();
  let name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const collection = parseCollectionInput(String(formData.get("collection") ?? ""));
  const packageSlug = slugify(String(formData.get("package") ?? "").trim());
  const categoryIds = formData
    .getAll("categoryIds")
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  const files = formData
    .getAll("files")
    .filter((item) => item instanceof File) as File[];

  if (files.length === 0) {
    return NextResponse.json(
      { error: channel.fileRequiredMessage },
      { status: 400 },
    );
  }

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const allowed = channel.allowedExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error: `${file.name}: ${channel.allowedExtensions.join(", ")} 파일만 업로드할 수 있습니다.`,
        },
        { status: 400 },
      );
    }
  }

  if (channel.id === "icons" && !packageSlug) {
    return NextResponse.json(
      { error: "패키지(package) slug가 필요합니다. 예: lucide, heroicons" },
      { status: 400 },
    );
  }

  const firstMeta = inferLogoMetaFromFilename(files[0].name);
  if (!shortname) shortname = firstMeta.shortname;
  if (!name) name = firstMeta.name;
  shortname = slugify(shortname);

  // 아이콘은 패키지 접두로 전역 shortname 충돌 방지
  if (channel.id === "icons" && packageSlug && !shortname.startsWith(`${packageSlug}-`)) {
    shortname = `${packageSlug}-${shortname}`;
  }

  if (!shortname || !name) {
    return NextResponse.json(
      { error: `${channel.namePlaceholder}과 shortname이 필요합니다.` },
      { status: 400 },
    );
  }

  try {
    const filePayload = await Promise.all(
      files.map(async (file, index) => {
        const lowerName = file.name.toLowerCase();
        const filename = normalizeAssetFilename(file.name, shortname, index);

        if (lowerName.endsWith(".svg")) {
          const content = await file.text();
          if (!content.includes("<svg")) {
            throw new Error(`${file.name}은 유효한 SVG가 아닙니다.`);
          }
          return {
            filename,
            content,
            encoding: "utf-8" as const,
          };
        }

        const binary = Buffer.from(await file.arrayBuffer());
        return {
          filename,
          content: binary.toString("base64"),
          encoding: "base64" as const,
        };
      }),
    );

    const uploadResult = await uploadLogoToGitHub({
      channelId: channel.id,
      shortname,
      name,
      url,
      collection,
      packageSlug: packageSlug || undefined,
      source: packageSlug || undefined,
      files: filePayload.map((file) => ({
        filename: file.filename,
        content: file.content,
        encoding: file.encoding,
      })),
    });

    const existing = getLogoByShortname(shortname, channel.id);
    const resolvedCollection = collection ?? existing?.collection ?? "simple";
    const resolvedSource =
      channel.id === "icons"
        ? packageSlug
        : sourceForCollection(resolvedCollection, existing?.source);

    upsertLogoLocally(
      {
        shortname,
        name,
        url,
        collection: resolvedCollection,
        source: resolvedSource,
        files: uploadResult.fileNames,
        previewFilename:
          existing?.previewFilename &&
          uploadResult.fileNames.includes(existing.previewFilename)
            ? existing.previewFilename
            : undefined,
      },
      channel.id,
    );

    updateLogoMetadata(shortname, categoryIds, tagIds);

    const cdnUrls = uploadResult.fileNames.map((filename) => ({
      filename,
      staticallyUrl: buildStaticallyUrl(filename, channel.id),
      githubPath: `${channel.assetDir}/${filename}`,
    }));

    return NextResponse.json({
      ok: true,
      shortname,
      name,
      package: packageSlug || null,
      commitSha: uploadResult.commitSha,
      githubUploaded: true,
      cdnUrls,
      detailPage: `${channel.detailPathPrefix}/${shortname}`,
      message:
        "GitHub 반영 완료. Statically CDN은 push 후 수 분 내 자동 갱신됩니다.",
      pipeline: [
        { step: "preview", status: "done", label: "PC 파일 로드" },
        { step: "github", status: "done", label: "GitHub 커밋" },
        { step: "cdn", status: "pending", label: "Statically CDN 전파" },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "업로드 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
