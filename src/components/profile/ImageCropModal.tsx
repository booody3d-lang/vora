"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useTranslations } from "@/i18n/use-translations";

const OUTPUT_SIZE = 512;

interface ImageCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string, blob: Blob) => void | Promise<void>;
  aspect?: number;
  cropShape?: "rect" | "round";
  outputWidth?: number;
  outputHeight?: number;
  titleKey?: string;
  hintKey?: string;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image")));
    image.src = url;
  });
}

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number
): Promise<{ blob: Blob; dataUrl: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("Crop failed"));
        else resolve(result);
      },
      "image/webp",
      0.88
    );
  });

  return { blob, dataUrl: canvas.toDataURL("image/webp", 0.88) };
}

export function ImageCropModal({
  imageSrc,
  onCancel,
  onConfirm,
  aspect = 1,
  cropShape = "round",
  outputWidth = OUTPUT_SIZE,
  outputHeight = OUTPUT_SIZE,
  titleKey = "profileEdit.cropTitle",
  hintKey = "profileEdit.cropHint",
}: ImageCropModalProps) {
  const { t } = useTranslations();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const { blob, dataUrl } = await getCroppedImage(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight
      );
      await onConfirm(dataUrl, blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.cancel")}
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-[#0F172A]">{t(titleKey)}</h3>
        <p className="mt-1 text-sm text-slate-500">{t(hintKey)}</p>

        <div className="relative mx-auto mt-4 h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          {t("profileEdit.cropZoom")}
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-[#3B5998]"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!croppedAreaPixels || saving}
            onClick={() => void handleConfirm()}
            className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("profileEdit.uploading") : t("profileEdit.cropSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
