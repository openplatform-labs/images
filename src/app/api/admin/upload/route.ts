import { NextResponse } from "next/server";
import {
  getLogoByShortname,
  updateLogoMetadata,
  upsertLogoLocally,
} from "@/lib/catalog";
import { parseCollectionInput, sourceForCollection } from "@/lib/collection";
import { isGitHubConfigured, uploadLogoToGitHub } from "@/lib/github";
import { buildStaticallyUrl } from "@/lib/statically";
import { inferLogoMetaFromFilename, normalizeSvgFilename } from "@/lib/filename";
import { slugify } from "@/lib/slug";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorizedResponse();

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
    return NextResponse.json({ error: "SVG 파일을 선택하세요." }, { status: 400 });
  }

  for (const file of files) {
    const isSvg =
      file.name.toLowerCase().endsWith(".svg") ||
      file.type === "image/svg+xml";
    if (!isSvg) {
      return NextResponse.json(
        { error: `${file.name}: SVG 파일만 업로드할 수 있습니다.` },
        { status: 400 },
      );
    }
  }

  const firstMeta = inferLogoMetaFromFilename(files[0].name);
  if (!shortname) shortname = firstMeta.shortname;
  if (!name) name = firstMeta.name;
  shortname = slugify(shortname);

  if (!shortname || !name) {
    return NextResponse.json(
      { error: "브랜드명과 shortname이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const filePayload = await Promise.all(
      files.map(async (file, index) => {
        const content = await file.text();
        if (!content.includes("<svg")) {
          throw new Error(`${file.name}은 유효한 SVG가 아닙니다.`);
        }

        return {
          filename: normalizeSvgFilename(file.name, shortname, index),
          content,
          originalName: file.name,
        };
      }),
    );

    const uploadResult = await uploadLogoToGitHub({
      shortname,
      name,
      url,
      collection,
      files: filePayload.map((file) => ({
        filename: file.filename,
        content: file.content,
      })),
    });

    const existing = getLogoByShortname(shortname);
    const resolvedCollection = collection ?? existing?.collection ?? "simple";
    const resolvedSource = sourceForCollection(
      resolvedCollection,
      existing?.source,
    );

    upsertLogoLocally({
      shortname,
      name,
      url,
      collection: resolvedCollection,
      source: resolvedSource,
      files: uploadResult.fileNames,
    });

    updateLogoMetadata(shortname, categoryIds, tagIds);

    const cdnUrls = uploadResult.fileNames.map((filename) => ({
      filename,
      staticallyUrl: buildStaticallyUrl(filename),
      githubPath: `logos/${filename}`,
    }));

    return NextResponse.json({
      ok: true,
      shortname,
      name,
      commitSha: uploadResult.commitSha,
      githubUploaded: true,
      cdnUrls,
      detailPage: `/logo/${shortname}`,
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
