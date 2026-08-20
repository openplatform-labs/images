"use client";

import {
  ILLUST_BASE_PRESETS,
  normalizeHexColor,
} from "@/lib/svg-base-color";

interface SvgBaseColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  detectedHex?: string | null;
}

export function SvgBaseColorPicker({
  value,
  onChange,
  disabled,
  detectedHex,
}: SvgBaseColorPickerProps) {
  const normalized = normalizeHexColor(value) ?? "#e24a2b";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Base color
          </p>
          <p className="mt-0.5 text-xs text-muted">
            일러스트 액센트 색을 바꿉니다.
            {detectedHex ? ` 감지됨 ${detectedHex}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative h-9 w-9 overflow-hidden rounded-full border border-border shadow-sm">
            <span
              className="absolute inset-0"
              style={{ background: normalized }}
              aria-hidden
            />
            <input
              type="color"
              value={normalized}
              disabled={disabled}
              onChange={(event) => {
                const next = normalizeHexColor(event.target.value);
                if (next) onChange(next);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="베이스 컬러 선택"
            />
          </label>
          <input
            value={normalized}
            disabled={disabled}
            onChange={(event) => {
              const next = normalizeHexColor(event.target.value);
              if (next) onChange(next);
            }}
            spellCheck={false}
            className="w-[7.5rem] rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-xs uppercase"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ILLUST_BASE_PRESETS.map((preset) => {
          const active = normalized === preset.hex;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              title={preset.label}
              onClick={() => onChange(preset.hex)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? "border-foreground text-foreground"
                  : "border-border text-muted hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ background: preset.hex }}
                aria-hidden
              />
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
