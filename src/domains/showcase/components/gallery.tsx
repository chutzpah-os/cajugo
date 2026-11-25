"use client";

import { useRef, useState, type ReactNode } from "react";

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
  const strip = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) =>
    strip.current?.scrollBy({
      left:
        dir * (strip.current.clientWidth / (window.innerWidth >= 1024 ? 3 : 1)),
      behavior: "smooth",
    });
  const arrow = `absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-ink shadow-md lg:size-12 ${images.length > 3 ? "" : "lg:hidden"}`;
  return (
    <div className="relative h-[280px] overflow-hidden bg-line-2 md:h-[360px] lg:h-[300px] lg:rounded-card">
      <div
        ref={strip}
        data-testid="gallery"
        tabIndex={0}
        role="group"
        aria-label="Fotos do veículo"
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(e) => {
          const { scrollLeft, clientWidth } = e.currentTarget;
          // Desktop: 3 fotos por vez (015, PRC-FR-006).
          const perView = window.innerWidth >= 1024 ? 3 : 1;
          setCurrent(Math.round((scrollLeft / clientWidth) * perView));
        }}
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
          <img
            // A mesma foto pode aparecer duas vezes; a posição torna a chave única.
            key={`${i}-${src}`}
            src={src}
            alt={`${alt} – foto ${i + 1}`}
            width={1600}
            height={1200}
            fetchPriority={i === 0 ? "high" : undefined}
            loading={i === 0 ? "eager" : "lazy"}
            className="h-full w-full shrink-0 snap-start object-cover lg:w-1/3 lg:border-r-4 lg:border-bg"
          />
        ))}
      </div>
      {children}
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Fotos anteriores"
            onClick={() => move(-1)}
            className={`${arrow} left-3`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximas fotos"
            onClick={() => move(1)}
            className={`${arrow} right-3`}
          >
            ›
          </button>
        </>
      )}
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
