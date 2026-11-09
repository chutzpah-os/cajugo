"use client";

import { useState } from "react";
import {
  shrinkImage,
  uploadSigned,
} from "@/platform/cloudinary/browser-upload";
import { IMAGE_WIDTHS, imageUrlFor } from "@/platform/cloudinary/urls";

import {
  addPhotoAction,
  photoUploadAction,
  removePhotoAction,
  reorderPhotosAction,
} from "../actions";
import { MAX_PHOTOS } from "../lists";
import type { PhotoView } from "../service";
import { useVehicleForm } from "./vehicle-form";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,.heic";
/** Conferido antes de reduzir: depois, o tamanho original já se perdeu (VEH-SEC-003). */
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Fotos [2a] (VEH-FR-004): até 20, reduzidas no navegador, com progresso; a 1ª é a
 * capa; reordenar arrastando ou pelos botões (teclado e celular); remover.
 */
export function PhotosSection({ cloudName }: { cloudName: string }) {
  const ctx = useVehicleForm();
  const [photos, setPhotos] = useState<PhotoView[]>(ctx.view?.photos ?? []);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [dragged, setDragged] = useState<number | null>(null);
  const shownError = error ?? ctx.errors.photos;

  const add = async (files: File[]) => {
    if (!files.length) return;
    setError(undefined);
    const refused = files.find(
      (f) =>
        f.size > MAX_BYTES || (f.type && !ACCEPT.split(",").includes(f.type)),
    );
    if (refused)
      return setError("Use fotos JPG, PNG, WEBP ou HEIC de até 15 MB.");
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0)
      return setError(`Limite de ${MAX_PHOTOS} fotos por veículo.`);
    const vehicleId = await ctx.ensureVehicleId();
    if (!vehicleId)
      return setError("Não foi possível salvar o rascunho. Tente de novo.");
    const list = files.slice(0, room);
    if (files.length > room)
      setError(`Limite de ${MAX_PHOTOS} fotos: enviamos só ${room}.`);
    for (const [i, file] of list.entries()) {
      setProgress(i / list.length);
      try {
        const signed = await photoUploadAction(vehicleId);
        if (!signed.ok) throw new Error(signed.message);
        const publicId = await uploadSigned(
          signed.upload,
          await shrinkImage(file),
          "Use fotos JPG, PNG, WEBP ou HEIC de até 15 MB.",
          (f) => setProgress((i + f) / list.length),
        );
        const saved = await addPhotoAction(vehicleId, publicId);
        if (!saved.ok)
          throw new Error(saved.message ?? Object.values(saved.errors)[0]);
        setPhotos((p) => [...p, saved.photo]);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Não foi possível enviar a foto.",
        );
        break;
      }
    }
    setProgress(null);
  };

  const reorder = async (next: PhotoView[]) => {
    const before = photos;
    setPhotos(next.map((p, position) => ({ ...p, position })));
    const id = ctx.view?.vehicleId;
    if (!id) return;
    const r = await reorderPhotosAction(
      id,
      next.map((p) => p.id),
    );
    if (!r.ok) {
      setPhotos(before);
      setError(r.message ?? "Não foi possível mudar a ordem.");
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void reorder(next);
  };

  const removeAt = async (index: number) => {
    const photo = photos[index];
    const id = ctx.view?.vehicleId;
    if (!id) return;
    const r = await removePhotoAction(id, photo.id);
    if (!r.ok) return setError(r.message ?? "Não foi possível remover.");
    setPhotos((p) =>
      p
        .filter((x) => x.id !== photo.id)
        .map((x, position) => ({ ...x, position })),
    );
  };

  return (
    <section
      id="fotos"
      aria-labelledby="fotos-title"
      className="flex scroll-mt-4 flex-col gap-3 rounded-card border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h2 id="fotos-title" className="text-[17px] font-extrabold">
          Fotos
        </h2>
        <span className="text-sm text-text-3" data-testid="photo-count">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>
      <p className="text-sm text-text-3">
        A primeira foto é a capa. Arraste ou use as setas para mudar a ordem.
      </p>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((p, i) => (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDragged(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragged !== null && move(dragged, i)}
              className="flex flex-col gap-1 rounded-input border border-line p-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-input bg-line-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada */}
                <img
                  src={imageUrlFor(cloudName, p.publicId, IMAGE_WIDTHS.thumb)}
                  alt={i === 0 ? "Foto de capa" : `Foto ${i + 1}`}
                  className="size-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">
                    Capa
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3">
                <button
                  type="button"
                  aria-label={`Mover foto ${i + 1} para antes`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="flex min-h-11 items-center justify-center disabled:opacity-30"
                >
                  ◀
                </button>
                <button
                  type="button"
                  aria-label={`Remover foto ${i + 1}`}
                  onClick={() => removeAt(i)}
                  className="flex min-h-11 items-center justify-center text-caju-deep"
                >
                  ✕
                </button>
                <button
                  type="button"
                  aria-label={`Mover foto ${i + 1} para depois`}
                  disabled={i === photos.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="flex min-h-11 items-center justify-center disabled:opacity-30"
                >
                  ▶
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {progress !== null && (
        <div
          role="progressbar"
          aria-label="Enviando fotos"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="h-2 overflow-hidden rounded-full bg-line-2"
        >
          <div
            className="h-full bg-caju transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-input border-2 border-dashed border-field-dash bg-surface p-3 text-sm font-bold">
        <input
          type="file"
          accept={ACCEPT}
          multiple
          disabled={progress !== null || photos.length >= MAX_PHOTOS}
          className="sr-only"
          data-testid="photo-input"
          onChange={(e) => {
            // Copia antes de limpar o campo: o envio lê depois de criar o rascunho.
            void add([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        {photos.length >= MAX_PHOTOS
          ? "Limite de fotos atingido"
          : "Adicionar fotos"}
      </label>
      {shownError && (
        <p role="alert" className="text-sm text-caju-deep">
          {shownError}
        </p>
      )}
    </section>
  );
}
