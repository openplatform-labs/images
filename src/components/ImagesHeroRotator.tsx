"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ImageHeroCandidate } from "@/lib/types";

const ROTATE_INTERVAL_MS = 60_000;

interface ImagesHeroRotatorProps {
  title: string;
  tagline: string;
  description: string;
  total: number;
  candidates: ImageHeroCandidate[];
  searchPlaceholder: string;
  query?: string;
  activeCategory?: string;
  activeTag?: string;
}

function pickRandomIndex(length: number, avoid?: number): number {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  if (avoid === undefined) return next;
  let guard = 0;
  while (next === avoid && guard < 8) {
    next = Math.floor(Math.random() * length);
    guard += 1;
  }
  return next;
}

export function ImagesHeroRotator({
  title,
  tagline,
  description,
  total,
  candidates,
  searchPlaceholder,
  query,
  activeCategory,
  activeTag,
}: ImagesHeroRotatorProps) {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (candidates.length === 0) return;
    setIndex(pickRandomIndex(candidates.length));
    setReady(true);

    const timer = window.setInterval(() => {
      setIndex((current) => pickRandomIndex(candidates.length, current));
    }, ROTATE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [candidates]);

  // 다음 장 프리로드
  useEffect(() => {
    if (candidates.length < 2) return;
    const next = candidates[(index + 1) % candidates.length];
    const image = new window.Image();
    image.src = next.imageUrl;
  }, [candidates, index]);

  const current = candidates[index] ?? null;

  return (
    <section className="images-hero relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      {current ? (
        <Image
          key={current.imageUrl}
          src={current.imageUrl}
          alt={current.name}
          fill
          priority
          unoptimized
          className="object-cover transition-opacity duration-700"
          sizes="100vw"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#1e3a5f,transparent_50%),radial-gradient(ellipse_at_80%_70%,#0f766e33,transparent_45%),#070b12]"
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-5 pb-14 pt-28 md:px-10 md:pb-20">
        <div className="max-w-3xl animate-soft-rise">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
            Image library
          </p>
          <h1 className="font-display mt-4 text-5xl font-bold uppercase tracking-[0.08em] text-white md:text-7xl lg:text-8xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
            {tagline}
          </p>
          <p className="mt-2 max-w-xl text-sm text-white/55">{description}</p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <form
            action="/"
            method="get"
            className="flex w-full max-w-xl overflow-hidden rounded-sm border border-white/25 bg-black/35 backdrop-blur-md"
          >
            {activeCategory && (
              <input type="hidden" name="category" value={activeCategory} />
            )}
            {activeTag && <input type="hidden" name="tag" value={activeTag} />}
            <input
              name="q"
              defaultValue={query}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              className="bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
            <span className="font-mono tracking-wide">
              {total.toLocaleString()} images
            </span>
            {current && (
              <Link
                href={current.href}
                className="border border-white/30 px-3 py-2 text-white/80 transition hover:border-white hover:text-white"
              >
                {ready ? current.name : "Featured"} →
              </Link>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              rotates / 1m · max res
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
