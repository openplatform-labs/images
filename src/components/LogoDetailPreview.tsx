"use client";

import { LogoImage } from "@/components/LogoImage";
import { LogoPreviewFrame } from "@/components/LogoPreviewFrame";
import { PreviewThemeSwitcher } from "@/components/PreviewThemeSwitcher";

interface LogoDetailPreviewProps {
  imageUrl: string;
  name: string;
}

export function LogoDetailPreview({ imageUrl, name }: LogoDetailPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PreviewThemeSwitcher />
      </div>
      <LogoPreviewFrame large className="rounded-2xl">
        <LogoImage src={imageUrl} alt={name} size="detail" />
      </LogoPreviewFrame>
    </div>
  );
}
