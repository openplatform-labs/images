"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Category, IconPackPreview, LogoCollection, Tag } from "@/lib/types";
import { CollectionPicker } from "@/components/admin/CollectionPicker";
import { ExistingLogoManager } from "@/components/admin/ExistingLogoManager";
import { LogoDropZone, type DroppedFile } from "@/components/admin/LogoDropZone";
import { UploadResultPanel } from "@/components/admin/UploadResultPanel";
import { adminFetch } from "@/lib/admin-client";
import { getBrowserChannelConfig } from "@/lib/channel";

interface UploadResult {
  shortname: string;
  name: string;
  commitSha: string;
  cdnUrls: { filename: string; staticallyUrl: string; githubPath: string }[];
  message: string;
}

interface AdminStatus {
  githubConfigured: boolean;
  repository: string;
  branch: string;
  staticallyCdnBase: string;
}

export default function ContentsAdminPage() {
  const channel = getBrowserChannelConfig();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);

  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [name, setName] = useState("");
  const [shortname, setShortname] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [collection, setCollection] = useState<LogoCollection>("simple");
  const [packageSlug, setPackageSlug] = useState("");
  const [packs, setPacks] = useState<IconPackPreview[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("manage");

  const loadMeta = useCallback(async () => {
    const [categoryResponse, tagResponse, statusResponse, packResponse] =
      await Promise.all([
        fetch("/api/categories"),
        fetch("/api/tags"),
        fetch("/api/admin/status"),
        channel.id === "icons" ? fetch("/api/packs") : Promise.resolve(null),
      ]);
    setCategories(await categoryResponse.json());
    setTags(await tagResponse.json());
    setStatus(await statusResponse.json());
    if (packResponse) {
      setPacks((await packResponse.json()) as IconPackPreview[]);
    }
  }, [channel.id]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  function resetUploadForm() {
    for (const file of droppedFiles) URL.revokeObjectURL(file.previewUrl);
    setDroppedFiles([]);
    setName("");
    setShortname("");
    setOfficialUrl("");
    setCollection("simple");
    setPackageSlug("");
    setSelectedCategories([]);
    setSelectedTags([]);
    setUploadResult(null);
    setUploadStep(null);
    setMessage("");
  }

  async function handlePublish(event: FormEvent) {
    event.preventDefault();

    if (!status?.githubConfigured) {
      setMessage("GITHUB_TOKEN을 .env.local에 설정한 뒤 서버를 재시작하세요.");
      return;
    }

    if (droppedFiles.length === 0) {
      setMessage(channel.fileRequiredMessage);
      return;
    }

    if (channel.id === "icons" && !packageSlug.trim()) {
      setMessage("묶음 slug가 필요합니다. 예: carbon (IBM Carbon), lucide");
      return;
    }

    setLoading(true);
    setUploadStep("GitHub에 반영 중...");
    setMessage("");

    const formData = new FormData();
    formData.set("name", name);
    formData.set("shortname", shortname);
    formData.set("url", officialUrl);
    formData.set("collection", collection);
    if (channel.id === "icons") {
      formData.set("package", packageSlug.trim());
    }
    for (const file of droppedFiles) {
      formData.append("files", file.file);
    }
    for (const categoryId of selectedCategories) {
      formData.append("categoryIds", String(categoryId));
    }
    for (const tagId of selectedTags) {
      formData.append("tagIds", String(tagId));
    }

    try {
      const response = await adminFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "업로드 실패");
        setUploadStep(null);
        return;
      }

      setUploadResult({
        shortname: data.shortname,
        name: data.name,
        commitSha: data.commitSha,
        cdnUrls: data.cdnUrls,
        message: data.message,
      });
      setUploadStep(null);
      await loadMeta();
    } catch {
      setMessage("네트워크 오류가 발생했습니다.");
      setUploadStep(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setLoading(true);
    const response = await adminFetch("/api/sync", { method: "POST" });
    const data = await response.json();
    setMessage(data.message ?? data.error);
    setLoading(false);
    await loadMeta();
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    await adminFetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory }),
    });
    setNewCategory("");
    await loadMeta();
  }

  async function handleCreateTag(event: FormEvent) {
    event.preventDefault();
    await adminFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag }),
    });
    setNewTag("");
    await loadMeta();
  }

  async function handleDeleteCategory(id: number) {
    await adminFetch(`/api/categories/${id}`, { method: "DELETE" });
    await loadMeta();
  }

  async function handleDeleteTag(id: number) {
    await adminFetch(`/api/tags/${id}`, { method: "DELETE" });
    await loadMeta();
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">콘텐츠 관리</h1>
          <p className="text-sm text-muted">{channel.contentsSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
        >
          {channel.syncButtonLabel}
        </button>
      </div>

      {status && !status.githubConfigured && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          GITHUB_TOKEN 미설정 — {channel.itemLabelKo} GitHub 배포가 비활성화되어
          있습니다.
        </p>
      )}

      <div className="flex gap-2 rounded-xl border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setActiveTab("manage")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "manage"
              ? "bg-accent text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {channel.manageTabLabel}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "upload"
              ? "bg-accent text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          {channel.uploadTabLabel}
        </button>
      </div>

      {activeTab === "manage" ? (
        <ExistingLogoManager
          categories={categories}
          tags={tags}
          githubConfigured={status?.githubConfigured ?? false}
          onSaved={() => void loadMeta()}
        />
      ) : uploadResult ? (
        <UploadResultPanel {...uploadResult} onReset={resetUploadForm} />
      ) : (
        <form onSubmit={handlePublish} className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-semibold">
              {channel.uploadSectionTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">{channel.uploadHint}</p>
            <div className="mt-4">
              <LogoDropZone
                files={droppedFiles}
                onFilesChange={setDroppedFiles}
                preferredShortname={shortname}
                onMetaSuggest={({
                  shortname: suggestedShortname,
                  name: suggestedName,
                }) => {
                  if (!shortname) setShortname(suggestedShortname);
                  if (!name) setName(suggestedName);
                }}
                disabled={loading}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-semibold">메타데이터</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={channel.namePlaceholder}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
              />
              <input
                value={shortname}
                onChange={(event) => setShortname(event.target.value)}
                placeholder="shortname"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2"
              />
              <input
                value={officialUrl}
                onChange={(event) => setOfficialUrl(event.target.value)}
                type="url"
                placeholder="공식 URL"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 md:col-span-2"
              />
            </div>

            <div className="mt-4">
              {channel.id === "icons" ? (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase text-muted">
                    묶음 (pack)
                  </label>
                  {packs.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {packs.map((pack) => (
                        <button
                          key={pack.slug}
                          type="button"
                          onClick={() => setPackageSlug(pack.slug)}
                          className={`rounded-full px-3 py-1 text-xs ${
                            packageSlug === pack.slug
                              ? "bg-accent text-background"
                              : "border border-border text-muted hover:text-foreground"
                          }`}
                        >
                          {pack.label}
                          <span className="ml-1 opacity-60">{pack.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    value={packageSlug}
                    onChange={(event) => setPackageSlug(event.target.value)}
                    placeholder="carbon, lucide, heroicons..."
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted">
                    IBM Carbon은 slug <span className="font-mono">carbon</span>으로
                    올리면 한 묶음으로 관리됩니다. CDN: icons/&#123;pack&#125;/…
                  </p>
                </div>
              ) : (
                <CollectionPicker
                  value={collection}
                  onChange={setCollection}
                  disabled={loading}
                />
              )}
            </div>

            <div className="mt-4">
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

            <div className="mt-4">
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

            {uploadStep && (
              <p className="mt-4 animate-pulse text-sm text-accent">{uploadStep}</p>
            )}
            {message && (
              <p className="mt-4 text-sm text-danger">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading || droppedFiles.length === 0}
              className="mt-4 w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-40"
            >
              {loading ? "배포 중..." : "GitHub에 배포하고 CDN URL 받기"}
            </button>
          </section>
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">카테고리</h2>
          <form onSubmit={handleCreateCategory} className="mt-3 flex gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="새 카테고리"
              className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-2 text-sm text-background"
            >
              추가
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {category.name}
                  <span className="ml-2 text-muted">({category.logoCount ?? 0})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-danger"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">태그</h2>
          <form onSubmit={handleCreateTag} className="mt-3 flex gap-2">
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              placeholder="#테크"
              className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-2 text-sm text-background"
            >
              추가
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {tag.name}
                  <span className="ml-2 text-muted">({tag.logoCount ?? 0})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-danger"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
