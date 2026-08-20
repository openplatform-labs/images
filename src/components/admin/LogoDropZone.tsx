"use client";

import { useCallback, useRef, useState } from "react";
import { SvgCodePaste } from "@/components/admin/SvgCodePaste";
import { getBrowserChannelConfig } from "@/lib/channel";
import { inferLogoMetaFromFilename } from "@/lib/filename";

export interface DroppedFile {
  file: File;
  previewUrl: string;
  id: string;
}

interface LogoDropZoneProps {
  files: DroppedFile[];
  onFilesChange: (files: DroppedFile[]) => void;
  onMetaSuggest: (meta: { shortname: string; name: string }) => void;
  disabled?: boolean;
  preferredShortname?: string;
  /** SVG 코드 입력란의 미확정 내용 */
  onPendingSvgCodeChange?: (code: string) => void;
}

type SourceMode = "file" | "code";

export function LogoDropZone({
  files,
  onFilesChange,
  onMetaSuggest,
  disabled,
  preferredShortname,
  onPendingSvgCodeChange,
}: LogoDropZoneProps) {
  const channel = getBrowserChannelConfig();
  const supportsSvgCode = channel.allowedExtensions.includes(".svg");
  const [sourceMode, setSourceMode] = useState<SourceMode>("file");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const acceptAttribute = channel.allowedExtensions.join(",");

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const allowedFiles = Array.from(incoming).filter((file) => {
        const lowerName = file.name.toLowerCase();
        return channel.allowedExtensions.some((extension) =>
          lowerName.endsWith(extension),
        );
      });

      if (allowedFiles.length === 0) return;

      const newItems: DroppedFile[] = allowedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `${file.name}-${file.size}-${file.lastModified}`,
      }));

      const merged = [...files];
      for (const item of newItems) {
        if (!merged.some((existing) => existing.id === item.id)) {
          merged.push(item);
        }
      }

      onFilesChange(merged);

      if (merged.length > 0) {
        onMetaSuggest(inferLogoMetaFromFilename(merged[0].file.name));
      }
    },
    [channel.allowedExtensions, files, onFilesChange, onMetaSuggest],
  );

  function removeFile(id: string) {
    const target = files.find((file) => file.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onFilesChange(files.filter((file) => file.id !== id));
  }

  return (
    <div className="space-y-4">
      {supportsSvgCode && (
        <div className="flex gap-1 rounded-lg border border-border bg-surface-elevated p-1">
          <button
            type="button"
            onClick={() => setSourceMode("file")}
            disabled={disabled}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              sourceMode === "file"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            파일 업로드
          </button>
          <button
            type="button"
            onClick={() => setSourceMode("code")}
            disabled={disabled}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              sourceMode === "code"
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            SVG 코드 입력
          </button>
        </div>
      )}

      {supportsSvgCode && sourceMode === "code" ? (
        <SvgCodePaste
          files={files}
          onFilesChange={onFilesChange}
          onMetaSuggest={onMetaSuggest}
          disabled={disabled}
          preferredShortname={preferredShortname}
          onPendingCodeChange={onPendingSvgCodeChange}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) addFiles(event.dataTransfer.files);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragging
              ? "border-accent bg-accent/10"
              : "border-border bg-surface-elevated hover:border-accent/50"
          } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-2xl text-accent">
            ↑
          </div>
          <p className="font-display text-lg font-semibold">
            {channel.dropzoneHint}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted">
            드래그 앤 드롭 또는 클릭하여 선택. 업로드 시 GitHub에 자동 커밋되고
            Statically CDN URL이 생성됩니다.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttribute}
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface-elevated p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted">
                  {(item.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile(item.id);
                }}
                className="text-sm text-danger"
              >
                제거
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
