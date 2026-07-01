"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { collectionLabels } from "@/lib/collection";
import { pickGalleryPreviewFile } from "@/lib/logo-files";
import type { Category, LogoCollection, LogoEntry, Tag } from "@/lib/types";
import { CopyButton } from "@/components/CopyButton";
import { LogoDropZone, type DroppedFile } from "@/components/admin/LogoDropZone";
import { authHeaders } from "@/lib/admin-client";

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
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<LogoCollection | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<LogoEntry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedShortname, setSelectedShortname] = useState<string | null>(null);
  const [logo, setLogo] = useState<LogoEntry | null>(null);
  const [name, setName] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [extraFiles, setExtraFiles] = useState<DroppedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadList = useCallback(async () => {
    setListLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: "name",
    });
    if (query.trim()) params.set("q", query.trim());
    if (collectionFilter) params.set("collection", collectionFilter);

    const response = await fetch(`/api/logos?${params.toString()}`);
    const data = await response.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setListLoading(false);
  }, [page, query, collectionFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadList();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadList]);

  async function loadLogo(shortname: string) {
    setEditorLoading(true);
    setMessage("");
    setExtraFiles([]);

    const response = await fetch(`/api/admin/logos/${shortname}`, {
      headers: authHeaders(),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "로고를 불러오지 못했습니다.");
      setEditorLoading(false);
      return;
    }

    setLogo(data);
    setName(data.name);
    setOfficialUrl(data.url ?? "");
    setSelectedCategories(data.categories.map((category: Category) => category.id));
    setSelectedTags(data.tags.map((tag: Tag) => tag.id));
    setSelectedShortname(shortname);
    setEditorLoading(false);
  }

  function clearSelection() {
    for (const file of extraFiles) URL.revokeObjectURL(file.previewUrl);
    setSelectedShortname(null);
    setLogo(null);
    setExtraFiles([]);
    setMessage("");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!selectedShortname) return;

    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/logos/${selectedShortname}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        url: officialUrl,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
        syncGithub: githubConfigured,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "저장 실패");
      setSaving(false);
      return;
    }

    setLogo(data.logo);
    setMessage(data.message ?? "저장되었습니다.");
    setSaving(false);
    onSaved?.();
    await loadList();
  }

  async function handleAddFiles() {
    if (!selectedShortname || extraFiles.length === 0) return;

    if (!githubConfigured) {
      setMessage("GITHUB_TOKEN이 설정되지 않았습니다.");
      return;
    }

    setUploadingFiles(true);
    setMessage("");

    const formData = new FormData();
    formData.set("shortname", selectedShortname);
    formData.set("name", name);
    formData.set("url", officialUrl);
    for (const file of extraFiles) {
      formData.append("files", file.file);
    }
    for (const categoryId of selectedCategories) {
      formData.append("categoryIds", String(categoryId));
    }
    for (const tagId of selectedTags) {
      formData.append("tagIds", String(tagId));
    }

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "파일 업로드 실패");
      setUploadingFiles(false);
      return;
    }

    for (const file of extraFiles) URL.revokeObjectURL(file.previewUrl);
    setExtraFiles([]);
    setMessage("SVG 파일이 GitHub에 추가되었습니다.");
    setUploadingFiles(false);
    await loadLogo(selectedShortname);
    onSaved?.();
    await loadList();
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

  const previewFile = logo
    ? pickGalleryPreviewFile(logo.files, logo.shortname, logo.collection)
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-xl font-semibold">기존 로고</h2>
        <p className="mt-1 text-sm text-muted">
          등록된 로고를 검색하고 선택해 편집합니다.
        </p>

        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="이름, shortname 검색..."
          className="mt-4 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
        />

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

        <p className="mt-3 text-xs text-muted">
          {total.toLocaleString()}개 · {page}/{totalPages} 페이지
        </p>

        <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {listLoading && (
            <p className="py-8 text-center text-sm text-muted">불러오는 중...</p>
          )}
          {!listLoading && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">검색 결과 없음</p>
          )}
          {items.map((item) => {
            const thumb = pickGalleryPreviewFile(
              item.files,
              item.shortname,
              item.collection,
            );
            const active = selectedShortname === item.shortname;

            return (
              <button
                key={item.shortname}
                type="button"
                onClick={() => loadLogo(item.shortname)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-white">
                  {thumb ? (
                    <Image
                      src={thumb.staticallyUrl}
                      alt={item.name}
                      width={56}
                      height={32}
                      className="max-h-8 max-w-14 object-contain"
                      unoptimized
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
                    {collectionLabels[item.collection]}
                  </p>
                </div>
              </button>
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
            왼쪽에서 로고를 선택하세요.
          </div>
        ) : editorLoading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted">
            불러오는 중...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">로고 편집</h2>
                <p className="mt-1 font-mono text-xs text-muted">
                  {selectedShortname}
                </p>
                {logo && (
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {collectionLabels[logo.collection]}
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
              <div className="flex justify-center rounded-xl bg-white p-6">
                <Image
                  src={previewFile.staticallyUrl}
                  alt={name}
                  width={220}
                  height={120}
                  className="max-h-28 w-auto object-contain"
                  unoptimized
                />
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="브랜드명"
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
                  CDN 파일
                </p>
                <ul className="space-y-2">
                  {logo.files.map((file) => (
                    <li
                      key={file.filename}
                      className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium">{file.filename}</span>
                        <span className="text-xs text-muted">{file.role}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate text-xs text-accent">
                          {file.staticallyUrl}
                        </code>
                        <CopyButton value={file.staticallyUrl} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="text-sm font-medium">SVG 파일 추가</p>
              <p className="mt-1 text-xs text-muted">
                기존 shortname에 SVG를 추가하면 GitHub에 병합됩니다.
              </p>
              <div className="mt-3">
                <LogoDropZone
                  files={extraFiles}
                  onFilesChange={setExtraFiles}
                  onMetaSuggest={() => {}}
                  disabled={uploadingFiles}
                />
              </div>
              {extraFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddFiles}
                  disabled={uploadingFiles || !githubConfigured}
                  className="mt-3 w-full rounded-lg border border-accent px-3 py-2 text-sm text-accent disabled:opacity-40"
                >
                  {uploadingFiles ? "업로드 중..." : "SVG만 GitHub에 추가"}
                </button>
              )}
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes("실패") || message.includes("없")
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
              {saving ? "저장 중..." : "변경사항 저장 (SQLite + GitHub)"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
