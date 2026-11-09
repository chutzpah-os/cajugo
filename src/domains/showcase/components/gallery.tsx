"use client";

import { useState, type ReactNode } from "react";

/** Galeria [1b]: rolagem nativa com encaixe, sem dependência; altura fixa evita CLS. */
export function Gallery({
  images,
  alt,
  children,
}: {
  images: string[];
  alt: string;
  children?: ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="relative h-[300px] bg-line-2 md:h-[420px]">
      <div
        data-testid="gallery"
        tabIndex={0}
        role="group"
        aria-label="Fotos do veículo"
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(e) => {
          const { scrollLeft, clientWidth } = e.currentTarget;
          setCurrent(Math.round(scrollLeft / clientWidth));
        }}
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
          <img
            key={src}
            src={src}
            alt={`${alt} – foto ${i + 1}`}
            width={1600}
            height={1200}
            fetchPriority={i === 0 ? "high" : undefined}
            loading={i === 0 ? "eager" : "lazy"}
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {children}
      {images.length > 0 && (
        <span
          data-testid="gallery-counter"
          className="absolute right-3 bottom-8 rounded-full bg-[rgba(28,27,32,.7)] px-2.5 py-1 text-xs font-semibold text-white"
        >
          {current + 1}/{images.length}
        </span>
      )}
    </div>
  );
}
