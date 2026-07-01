"use client";

import Image from "next/image";
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
        <Image
          src={imageUrl}
          alt={name}
          width={400}
          height={240}
          className="max-h-[220px] w-auto max-w-full object-contain"
          unoptimized
        />
      </LogoPreviewFrame>
    </div>
  );
}
