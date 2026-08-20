"use client";

import { ImageFullView } from "@/components/ImageFullView";
import { LogoImage } from "@/components/LogoImage";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { collectionLabels } from "@/lib/collection";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import type { Category, IconPackPreview, LogoCollection, LogoEntry, Tag } from "@/lib/types";
import { CollectionPicker } from "@/components/admin/CollectionPicker";
import { CopyButton } from "@/components/CopyButton";
import { LogoDropZone, type DroppedFile } from "@/components/admin/LogoDropZone";
import { normalizeSvgMarkup } from "@/components/admin/SvgCodePaste";
import { SvgBaseColorPicker } from "@/components/admin/SvgBaseColorPicker";
import { adminFetch, parseApiResponse } from "@/lib/admin-client";
import { getBrowserChannelConfig } from "@/lib/channel";
import { formatIconPackLabel } from "@/lib/icon-pack";
import { toAbsoluteCdnUrl } from "@/lib/statically";
import {
  applySvgBaseColor,
  detectSvgBaseColor,
  normalizeHexColor,
} from "@/lib/svg-base-color";

interface ExistingLogoManagerProps {
  categories: Category[];
  tags: Tag[];
  githubConfigured: boolean;
  onSaved?: () => void;
}

export function ExistingLogoManager({
  categories,
  tags,
  githubConfigured,
  onSaved,
}: ExistingLogoManagerProps) {
  const channel = getBrowserChannelConfig();
  const isIllustAdmin = channel.id === "illust";
  const isAvatarsAdmin = channel.id === "avatars";
  const isLargePreviewAdmin = isIllustAdmin || isAvatarsAdmin;
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<LogoCollection | "">("");
  const [packageFilter, setPackageFilter] = useState("");
  const [packs, setPacks] = useState<IconPackPreview[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<LogoEntry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedShortname, setSelectedShortname] = useState<string | null>(null);
  const [logo, setLogo] = useState<LogoEntry | null>(null);
  const [name, setName] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [collection, setCollection] = useState<LogoCollection>("simple");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [extraFiles, setExtraFiles] = useState<DroppedFile[]>([]);
  // SVG 코드 입력란에만 있고 목록에 아직 안 넣은 내용
  const [pendingSvgCode, setPendingSvgCode] = useState("");
  const [fullViewOpen, setFullViewOpen] = useState(false);
  const [svgSource, setSvgSource] = useState<string | null>(null);
  const [baseColor, setBaseColor] = useState("#e24a2b");
  const [detectedBaseColor, setDetectedBaseColor] = useState<string | null>(
    null,
  );
  const [recolorPreviewUrl, setRecolorPreviewUrl] = useState<string | null>(
    null,
  );
  const [recolorSaving, setRecolorSaving] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);
  // CDN 목록에서 고른 하위 파일 미리보기
  const [focusedFilename, setFocusedFilename] = useState<string | null>(null);

  const pageSize = isLargePreviewAdmin ? 18 : 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canMergeLogos =
    channel.id === "logos" || channel.id === "illust" || channel.id === "images";
  const mergeReady = canMergeLogos && mergeSelection.length >= 2;

  const loadList = useCallback(async () => {
    setListLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: "name",
    });
    if (query.trim()) params.set("q", query.trim());
    if (channel.id === "logos" && collectionFilter) {
      params.set("collection", collectionFilter);
    }
    if (channel.id === "icons" && packageFilter.trim()) {
      params.set("source", packageFilter.trim());
    }

    try {
      const response = await fetch(`/api/logos?${params.toString()}`);
      const data = await parseApiResponse<{
        items?: LogoEntry[];
        total?: number;
      }>(response);
      if (!response.ok) return;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [page, query, collectionFilter, packageFilter, channel.id, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadList();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadList]);

  useEffect(() => {
    if (channel.id !== "icons") return;
    void fetch("/api/packs")
      .then((response) => response.json())
      .then((data: IconPackPreview[]) => {
        if (Array.isArray(data)) setPacks(data);
      })
      .catch(() => {
        setPacks([]);
      });
  }, [channel.id]);

  async function loadLogo(shortname: string) {
    setSelectedShortname(shortname);
    setEditorLoading(true);
    setMessage("");
    setExtraFiles([]);
    setPendingSvgCode("");
    setFocusedFilename(null);
    setLogo(null);
    setFullViewOpen(false);
    setSvgSource(null);
    setRecolorPreviewUrl(null);
    setDetectedBaseColor(null);

    try {
      const response = await adminFetch(
        `/api/admin/logos/${encodeURIComponent(shortname)}`,
      );
      const data = await parseApiResponse<LogoEntry & { error?: string }>(
        response,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setMessage("세션이 만료되었습니다. 다시 로그인해 주세요.");
        } else {
          setMessage(data.error ?? `${channel.itemLabelKo}를 불러오지 못했습니다.`);
        }
        setEditorLoading(false);
        return;
      }

      setLogo(data);
      setName(data.name);
      setOfficialUrl(data.url ?? "");
      setCollection(data.collection ?? "simple");
      setSelectedCategories(data.categories.map((category) => category.id));
      setSelectedTags(data.tags.map((tag) => tag.id));
      setEditorLoading(false);

      // illust: SVG를 가져와 베이스 컬러 편집에 사용
      if (channel.id === "illust") {
        const preview = pickGalleryPreviewFile(
          data.files,
          data.shortname,
          data.collection,
          data.source,
          data.previewFilename,
        );
        if (preview?.staticallyUrl) {
          try {
            const svgResponse = await fetch(
              `${toAbsoluteCdnUrl(preview.staticallyUrl, channel.id)}?v=${Date.now()}`,
              { cache: "no-store" },
            );
            if (svgResponse.ok) {
              const svgText = await svgResponse.text();
              if (svgText.includes("<svg")) {
                const detected = detectSvgBaseColor(svgText);
                setSvgSource(svgText);
                setDetectedBaseColor(detected);
                setBaseColor(detected);
              }
            }
          } catch {
            // 미리보기 색상 로드 실패는 편집을 막지 않음
          }
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `${channel.itemLabelKo}를 불러오지 못했습니다.`,
      );
      setEditorLoading(false);
    }
  }

  function clearSelection() {
    for (const file of extraFiles) URL.revokeObjectURL(file.previewUrl);
    setSelectedShortname(null);
    setLogo(null);
    setExtraFiles([]);
    setPendingSvgCode("");
    setFocusedFilename(null);
    setMessage("");
    setFullViewOpen(false);
    setSvgSource(null);
    setRecolorPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setDetectedBaseColor(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!selectedShortname) return;

    setSaving(true);
    setMessage("");

    const pendingFiles = [...extraFiles];
    // 「목록에 추가」를 누르지 않아도 입력란 SVG를 저장에 포함
    if (pendingSvgCode.trim()) {
      try {
        const content = normalizeSvgMarkup(pendingSvgCode);
        const filename = `${selectedShortname}.svg`;
        const file = new File([content], filename, {
          type: "image/svg+xml",
        });
        pendingFiles.push({
          file,
          previewUrl: URL.createObjectURL(file),
          id: `pending-save-${filename}-${Date.now()}`,
        });
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "SVG 코드가 올바르지 않습니다.",
        );
        setSaving(false);
        return;
      }
    }

    let uploadedFileCount = 0;

    try {
      if (pendingFiles.length > 0) {
        if (!githubConfigured) {
          setMessage("GITHUB_TOKEN이 설정되지 않았습니다.");
          setSaving(false);
          return;
        }

        const formData = new FormData();
        formData.set("shortname", selectedShortname);
        formData.set("name", name);
        formData.set("url", officialUrl);
        formData.set("collection", collection);
        if (channel.id === "icons" && logo?.source) {
          formData.set("package", logo.source);
        }
        for (const file of pendingFiles) {
          formData.append("files", file.file);
        }
        for (const categoryId of selectedCategories) {
          formData.append("categoryIds", String(categoryId));
        }
        for (const tagId of selectedTags) {
          formData.append("tagIds", String(tagId));
        }

        const uploadResponse = await adminFetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await parseApiResponse<{ error?: string }>(
          uploadResponse,
        );

        if (!uploadResponse.ok) {
          setMessage(uploadData.error ?? "파일 업로드 실패");
          setSaving(false);
          return;
        }

        for (const file of pendingFiles) URL.revokeObjectURL(file.previewUrl);
        setExtraFiles([]);
        setPendingSvgCode("");
        uploadedFileCount = pendingFiles.length;
      }

      // 파일 업로드가 GitHub 카탈로그를 이미 썼으면 메타는 SQLite만 갱신
      const response = await adminFetch(
        `/api/admin/logos/${encodeURIComponent(selectedShortname)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            url: officialUrl,
            collection,
            categoryIds: selectedCategories,
            tagIds: selectedTags,
            syncGithub: githubConfigured && uploadedFileCount === 0,
          }),
        },
      );

      const data = await parseApiResponse<{
        error?: string;
        message?: string;
        logo?: LogoEntry;
      }>(response);

      if (!response.ok) {
        setMessage(data.error ?? "저장 실패");
        setSaving(false);
        return;
      }

      if (data.logo) setLogo(data.logo);
      setMessage(
        uploadedFileCount > 0
          ? `파일 ${uploadedFileCount}개와 변경사항을 일괄 저장했습니다.`
          : (data.message ?? "저장되었습니다."),
      );
      setSaving(false);
      await loadLogo(selectedShortname);
      onSaved?.();
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장 실패");
      setSaving(false);
    }
  }

  function toggleMergeSelection(shortname: string) {
    setMergeSelection((previous) => {
      const next = previous.includes(shortname)
        ? previous.filter((value) => value !== shortname)
        : [...previous, shortname];
      setMergeTarget((current) => {
        if (next.length === 0) return "";
        if (current && next.includes(current)) return current;
        if (selectedShortname && next.includes(selectedShortname)) {
          return selectedShortname;
        }
        return next[0];
      });
      return next;
    });
  }

  async function handleMerge() {
    if (!mergeReady || !mergeTarget) return;
    const sources = mergeSelection.filter((value) => value !== mergeTarget);
    if (sources.length === 0) {
      setMessage("타깃을 제외한 소스 항목이 필요합니다.");
      return;
    }

    const confirmed = window.confirm(
      `'${sources.join("', '")}' 을(를) '${mergeTarget}' 로 병합합니다.\n소스 항목은 삭제되고 파일은 타깃 Brand Kit으로 합쳐집니다. 계속할까요?`,
    );
    if (!confirmed) return;

    setMerging(true);
    setMessage("");

    try {
      const targetLogo =
        selectedShortname === mergeTarget ? logo : null;
      const response = await adminFetch("/api/admin/logos/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetShortname: mergeTarget,
          sourceShortnames: sources,
          name: targetLogo?.name,
          url: targetLogo?.url ?? undefined,
          collection: "themed",
          categoryIds: targetLogo?.categories.map((category) => category.id),
          tagIds: targetLogo?.tags.map((tag) => tag.id),
        }),
      });
      const data = await parseApiResponse<{
        error?: string;
        message?: string;
        targetShortname?: string;
      }>(response);

      if (!response.ok) {
        setMessage(data.error ?? "병합 실패");
        setMerging(false);
        return;
      }

      setMergeSelection([]);
      setMergeTarget("");
      setMessage(data.message ?? "병합되었습니다.");
      setMerging(false);
      await loadList();
      await loadLogo(data.targetShortname ?? mergeTarget);
      onSaved?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "병합 실패");
      setMerging(false);
    }
  }

  function toggleCategory(id: number) {
    setSelectedCategories((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  function toggleTag(id: number) {
    setSelectedTags((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  // 베이스 컬러 변경 시 즉시 미리보기 blob 갱신
  useEffect(() => {
    if (!isIllustAdmin || !svgSource) {
      setRecolorPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      return;
    }

    try {
      const recolored = applySvgBaseColor(svgSource, baseColor);
      const objectUrl = URL.createObjectURL(
        new Blob([recolored], { type: "image/svg+xml" }),
      );
      setRecolorPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return objectUrl;
      });
    } catch {
      // hex 입력이 불완전하면 미리보기 유지
    }
  }, [isIllustAdmin, svgSource, baseColor]);

  async function handleSaveBaseColor() {
    if (!selectedShortname || !logo || !svgSource) return;
    if (!githubConfigured) {
      setMessage("GITHUB_TOKEN이 설정되지 않았습니다.");
      return;
    }

    const normalized = normalizeHexColor(baseColor);
    if (!normalized) {
      setMessage("올바른 hex 색상(#RRGGBB)을 입력하세요.");
      return;
    }

    setRecolorSaving(true);
    setMessage("");

    try {
      const recolored = applySvgBaseColor(svgSource, normalized);
      const filename =
        pickGalleryPreviewFile(
          logo.files,
          logo.shortname,
          logo.collection,
          logo.source,
          logo.previewFilename,
        )?.filename ?? `${selectedShortname}.svg`;
      const file = new File([recolored], filename, {
        type: "image/svg+xml",
      });

      const formData = new FormData();
      formData.set("shortname", selectedShortname);
      formData.set("name", name || logo.name);
      formData.set("url", officialUrl);
      formData.set("collection", collection);
      formData.append("files", file);
      for (const categoryId of selectedCategories) {
        formData.append("categoryIds", String(categoryId));
      }
      for (const tagId of selectedTags) {
        formData.append("tagIds", String(tagId));
      }

      const response = await adminFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await parseApiResponse<{ error?: string }>(response);
      if (!response.ok) {
        setMessage(data.error ?? "베이스 컬러 저장 실패");
        setRecolorSaving(false);
        return;
      }

      setSvgSource(recolored);
      setDetectedBaseColor(normalized);
      setMessage(`베이스 컬러 ${normalized} 적용 · GitHub 반영 완료`);
      setRecolorSaving(false);
      await loadLogo(selectedShortname);
      onSaved?.();
      await loadList();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "베이스 컬러 저장 실패",
      );
      setRecolorSaving(false);
    }
  }

  async function handleSetPreviewFilename(filename: string) {
    if (!selectedShortname || !logo) return;
    if (logo.previewFilename === filename) {
      setFocusedFilename(filename);
      return;
    }
    if (!githubConfigured) {
      setMessage("GITHUB_TOKEN이 설정되지 않았습니다.");
      return;
    }

    setSaving(true);
    setMessage("");
    setFocusedFilename(filename);

    try {
      const response = await adminFetch(
        `/api/admin/logos/${encodeURIComponent(selectedShortname)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            url: officialUrl,
            collection,
            categoryIds: selectedCategories,
            tagIds: selectedTags,
            previewFilename: filename,
            syncGithub: true,
          }),
        },
      );
      const data = await parseApiResponse<{
        error?: string;
        message?: string;
        logo?: LogoEntry;
      }>(response);

      if (!response.ok) {
        setMessage(data.error ?? "기본 이미지 설정 실패");
        setSaving(false);
        return;
      }

      if (data.logo) setLogo(data.logo);
      setMessage(`'${filename}'을(를) 기본 이미지로 설정했습니다.`);
      setSaving(false);
      onSaved?.();
      await loadList();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "기본 이미지 설정 실패",
      );
      setSaving(false);
    }
  }

  const previewFile = logo
    ? (focusedFilename
        ? (logo.files.find((file) => file.filename === focusedFilename) ??
          pickGalleryPreviewFile(
            logo.files,
            logo.shortname,
            logo.collection,
            logo.source,
            logo.previewFilename,
          ))
        : pickGalleryPreviewFile(
            logo.files,
            logo.shortname,
            logo.collection,
            logo.source,
            logo.previewFilename,
          ))
    : null;
  // 포커스와 무관한 갤러리 기본 파일 (배지/버튼용)
  const galleryDefaultFilename = logo
    ? (logo.previewFilename ??
      pickGalleryPreviewFile(
        logo.files,
        logo.shortname,
        logo.collection,
        logo.source,
        logo.previewFilename,
      )?.filename ??
      null)
    : null;
  const previewAbsoluteUrl = previewFile
    ? toAbsoluteCdnUrl(previewFile.staticallyUrl, channel.id)
    : "";
  const stagePreviewSrc = recolorPreviewUrl ?? previewFile?.staticallyUrl ?? "";
  const baseColorDirty = useMemo(() => {
    if (!detectedBaseColor) return Boolean(svgSource);
    return normalizeHexColor(baseColor) !== detectedBaseColor;
  }, [baseColor, detectedBaseColor, svgSource]);

  return (
    <div
      className={`grid gap-6 ${
        isLargePreviewAdmin
          ? "lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.35fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      }`}
    >
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">
          {channel.existingTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{channel.existingHint}</p>

        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="모든 묶음에서 이름, shortname 검색..."
          className="mt-4 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
        />

        {channel.id === "icons" ? (
          <select
            value={packageFilter}
            onChange={(event) => {
              setPackageFilter(event.target.value);
              setPage(1);
            }}
            className="mt-3 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-sm"
          >
            <option value="">전체 묶음에서 검색</option>
            {packs.map((pack) => (
              <option key={pack.slug} value={pack.slug}>
                {pack.label} ({pack.count})
              </option>
            ))}
          </select>
        ) : channel.id === "logos" ? (
          <select
            value={collectionFilter}
            onChange={(event) => {
              setCollectionFilter(event.target.value as LogoCollection | "");
              setPage(1);
            }}
            className="mt-3 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
          >
            <option value="">전체 컬렉션</option>
            <option value="simple">{collectionLabels.simple}</option>
            <option value="themed">{collectionLabels.themed}</option>
          </select>
        ) : null}

        <p className="mt-3 text-xs text-muted">
          {total.toLocaleString()}개 · {page}/{totalPages} 페이지
        </p>

        {canMergeLogos && mergeSelection.length > 0 && (
          <div className="mt-3 space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
            <p className="text-xs font-medium text-accent">
              {mergeSelection.length}개 선택됨
              {mergeReady
                ? " — 하나로 병합할 수 있습니다"
                : " — 2개 이상 선택하세요"}
            </p>
            {mergeReady && (
              <label className="block text-xs text-muted">
                병합 타깃 (남는 shortname)
                <select
                  value={mergeTarget}
                  onChange={(event) => setMergeTarget(event.target.value)}
                  disabled={merging}
                  className="mt-1 w-full rounded-md border border-border bg-surface-elevated px-2 py-1.5 font-mono text-xs text-foreground"
                >
                  {mergeSelection.map((shortname) => (
                    <option key={shortname} value={shortname}>
                      {shortname}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleMerge()}
                disabled={!mergeReady || merging || !githubConfigured}
                className="flex-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
              >
                {merging ? "병합 중..." : "선택 항목 병합"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMergeSelection([]);
                  setMergeTarget("");
                }}
                disabled={merging}
                className="rounded-md border border-border px-3 py-1.5 text-xs"
              >
                선택 해제
              </button>
            </div>
          </div>
        )}

        <div
          className={`relative mt-3 overflow-y-auto pr-1 ${
            isLargePreviewAdmin ? "max-h-[70vh] space-y-3" : "max-h-[520px] space-y-2"
          }`}
        >
          {listLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-surface/60 pt-8">
              <p className="text-sm text-muted">불러오는 중...</p>
            </div>
          )}
          {!listLoading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">검색 결과 없음</p>
          )}
          {items.map((item) => {
            const thumb = pickGalleryPreviewFile(
              item.files,
              item.shortname,
              item.collection,
              item.source,
              item.previewFilename,
            );
            const active = selectedShortname === item.shortname;
            const checked = mergeSelection.includes(item.shortname);

            return (
              <div
                key={item.shortname}
                className={`flex w-full items-stretch gap-2 rounded-lg border transition ${
                  isLargePreviewAdmin
                    ? `flex-col p-3 ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/40"
                      }`
                    : `px-2 py-2 ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/40"
                      }`
                }`}
              >
                {canMergeLogos && (
                  <label
                    className={`flex shrink-0 items-center justify-center ${
                      isLargePreviewAdmin ? "self-start" : "px-1"
                    }`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMergeSelection(item.shortname)}
                      disabled={merging || saving}
                      className="h-4 w-4 accent-[var(--accent)]"
                      aria-label={`${item.shortname} 병합 선택`}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => void loadLogo(item.shortname)}
                  className={`flex min-w-0 flex-1 text-left ${
                    isLargePreviewAdmin
                      ? "flex-col gap-2"
                      : "items-center gap-3"
                  }`}
                >
                <div
                  className={`pointer-events-none flex shrink-0 items-center justify-center ${
                    isAvatarsAdmin
                      ? "avatars-admin-list-ring mx-auto h-32 w-32 overflow-hidden rounded-full"
                      : isIllustAdmin
                        ? "illust-admin-list-mat h-36 w-full rounded-md p-3"
                        : "h-12 w-16 rounded-md bg-white"
                  }`}
                >
                  {thumb ? (
                    <LogoImage
                      src={thumb.staticallyUrl}
                      alt={item.name}
                      size={isLargePreviewAdmin ? "adminList" : "thumb"}
                      className={
                        isAvatarsAdmin
                          ? "!h-full !w-full !max-h-none !max-w-none object-cover"
                          : isIllustAdmin
                            ? "!h-full !max-h-28 !max-w-full w-auto"
                            : undefined
                      }
                    />
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate font-mono text-xs text-muted">
                    {item.shortname}
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-wide text-muted">
                    {channel.id === "icons"
                      ? formatIconPackLabel(item.source)
                      : collectionLabels[item.collection]}
                  </p>
                </div>
              </button>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex justify-between gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        {!selectedShortname ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted">
            왼쪽에서 {channel.itemLabelKo}를 선택하세요.
          </div>
        ) : editorLoading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-sm text-muted">
            <p>불러오는 중...</p>
            <p className="font-mono text-xs">{selectedShortname}</p>
          </div>
        ) : !logo ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-danger">
              {message || `${channel.itemLabelKo}를 불러오지 못했습니다.`}
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-muted hover:text-foreground"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {channel.editTitle}
                </h2>
                <p className="mt-1 font-mono text-xs text-muted">
                  {selectedShortname}
                </p>
                {logo && (
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {collectionLabels[collection]}
                    {logo.source ? ` · ${logo.source}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-muted hover:text-foreground"
              >
                닫기
              </button>
            </div>

            {previewFile && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    미리보기
                    {previewFile ? (
                      <span className="ml-2 font-mono normal-case tracking-normal text-[10px] text-muted">
                        {previewFile.filename}
                      </span>
                    ) : null}
                  </p>
                  {isLargePreviewAdmin && (
                    <button
                      type="button"
                      onClick={() => setFullViewOpen(true)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:border-accent hover:text-accent"
                    >
                      전체 보기
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isLargePreviewAdmin) setFullViewOpen(true);
                  }}
                  className={`flex w-full justify-center ${
                    isAvatarsAdmin
                      ? "avatars-admin-stage-ring mx-auto h-[min(52vh,440px)] w-[min(52vh,440px)] cursor-zoom-in overflow-hidden rounded-full p-0"
                      : isIllustAdmin
                        ? "illust-admin-stage-mat cursor-zoom-in rounded-xl p-4 md:p-6"
                        : "rounded-xl bg-white p-4 md:p-6"
                  }`}
                  aria-label={isLargePreviewAdmin ? "전체 보기 열기" : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stagePreviewSrc}
                    alt={name}
                    className={
                      isAvatarsAdmin
                        ? "h-full w-full object-cover"
                        : isIllustAdmin
                          ? "h-[min(52vh,520px)] max-h-[min(52vh,520px)] w-auto max-w-full object-contain"
                          : "h-[120px] w-auto max-w-full object-contain"
                    }
                  />
                </button>

                {isIllustAdmin && svgSource && (
                  <div className="space-y-3">
                    <SvgBaseColorPicker
                      value={baseColor}
                      detectedHex={detectedBaseColor}
                      onChange={setBaseColor}
                      disabled={recolorSaving || saving}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveBaseColor()}
                      disabled={
                        recolorSaving ||
                        saving ||
                        !githubConfigured ||
                        !baseColorDirty
                      }
                      className="w-full rounded-lg border border-accent px-3 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:opacity-40"
                    >
                      {recolorSaving
                        ? "색상 저장 중..."
                        : "베이스 컬러 GitHub에 저장"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={channel.namePlaceholder}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
              />
              <input
                value={officialUrl}
                onChange={(event) => setOfficialUrl(event.target.value)}
                type="url"
                placeholder="공식 URL"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
              />
            </div>

            {channel.id === "icons" ? (
              <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  묶음 (pack)
                </p>
                <p className="mt-0.5 text-sm">
                  {formatIconPackLabel(logo.source)}
                </p>
                <p className="font-mono text-xs text-muted">
                  {logo.source ?? "—"}
                </p>
              </div>
            ) : (
              <CollectionPicker
                value={collection}
                onChange={setCollection}
                disabled={saving}
              />
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted">
                카테고리
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      selectedCategories.includes(category.id)
                        ? "bg-accent text-background"
                        : "border border-border"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted">태그</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      selectedTags.includes(tag.id)
                        ? "bg-accent-muted text-background"
                        : "border border-border"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {logo && logo.files.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted">
                  CDN 파일 ({logo.files.length})
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {logo.files.map((file) => {
                    const absoluteUrl = toAbsoluteCdnUrl(
                      file.staticallyUrl,
                      channel.id,
                    );
                    const isFocused =
                      (focusedFilename ?? previewFile?.filename) ===
                      file.filename;
                    const isDefaultPreview =
                      galleryDefaultFilename === file.filename;

                    return (
                      <li
                        key={file.filename}
                        className={`rounded-lg border bg-surface-elevated p-2 transition ${
                          isFocused
                            ? "border-accent ring-1 ring-accent/30"
                            : "border-border"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFocusedFilename(file.filename);
                            setFullViewOpen(false);
                          }}
                          onDoubleClick={() => {
                            setFocusedFilename(file.filename);
                            setFullViewOpen(true);
                          }}
                          className="flex w-full items-center gap-3 text-left"
                          title="클릭: 미리보기 · 더블클릭: 전체 보기"
                        >
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-white p-1.5">
                            <LogoImage
                              src={absoluteUrl}
                              alt={file.filename}
                              size="thumb"
                              className="!h-full !max-h-14 !max-w-14"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {file.filename}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-muted">
                              {file.role}
                            </p>
                          </div>
                        </button>
                        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                          <code className="min-w-0 flex-1 truncate text-[10px] text-accent">
                            {absoluteUrl}
                          </code>
                          <CopyButton
                            value={absoluteUrl}
                            label="CDN 절대경로 복사"
                          />
                          {isDefaultPreview ? (
                            <span className="rounded-md bg-accent/15 px-2 py-1 text-[10px] font-semibold text-accent">
                              기본
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                void handleSetPreviewFilename(file.filename)
                              }
                              className="rounded-md border border-border px-2 py-1 text-[10px] font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
                            >
                              기본으로 설정
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="text-sm font-medium">{channel.fileAddTitle}</p>
              <p className="mt-1 text-xs text-muted">{channel.fileAddHint}</p>
              <div className="mt-3">
                <LogoDropZone
                  files={extraFiles}
                  onFilesChange={setExtraFiles}
                  preferredShortname={selectedShortname ?? undefined}
                  onMetaSuggest={() => {}}
                  onPendingSvgCodeChange={setPendingSvgCode}
                  disabled={saving}
                />
              </div>
              {(extraFiles.length > 0 || pendingSvgCode.trim()) && (
                <p className="mt-2 text-xs text-accent">
                  {extraFiles.length + (pendingSvgCode.trim() ? 1 : 0)}개 파일
                  준비됨 — 아래 저장 버튼을 누르면 메타데이터와 함께 일괄
                  반영됩니다.
                </p>
              )}
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes("실패") ||
                  message.includes("없") ||
                  message.includes("비어") ||
                  message.includes("해석")
                    ? "text-danger"
                    : "text-accent"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-background disabled:opacity-40"
            >
              {saving
                ? "저장 중..."
                : extraFiles.length > 0 || pendingSvgCode.trim()
                  ? `파일 ${extraFiles.length + (pendingSvgCode.trim() ? 1 : 0)}개 + 변경사항 일괄 저장`
                  : "변경사항 저장 (SQLite + GitHub)"}
            </button>
          </form>
        )}
      </section>

      {fullViewOpen && (recolorPreviewUrl || previewAbsoluteUrl) && (
        <ImageFullView
          src={recolorPreviewUrl || previewAbsoluteUrl}
          alt={name || selectedShortname || ""}
          label="관리자 미리보기"
          onClose={() => setFullViewOpen(false)}
        />
      )}
    </div>
  );
}
