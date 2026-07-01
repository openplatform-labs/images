import { collectionLabels } from "@/lib/collection";
import type { LogoCollection } from "@/lib/types";

interface CollectionPickerProps {
  value: LogoCollection;
  onChange: (collection: LogoCollection) => void;
  disabled?: boolean;
}

export function CollectionPicker({
  value,
  onChange,
  disabled = false,
}: CollectionPickerProps) {
  const options: { key: LogoCollection; description: string }[] = [
    {
      key: "simple",
      description: "{slug}.svg · {slug}-icon.svg",
    },
    {
      key: "themed",
      description: "wordmark, light/dark, mono 등 brand kit",
    },
  ];

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted">컬렉션</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = value === option.key;

          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.key)}
              className={`rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-40 ${
                active
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <p className="text-sm font-medium">{collectionLabels[option.key]}</p>
              <p className="mt-0.5 text-xs text-muted">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
