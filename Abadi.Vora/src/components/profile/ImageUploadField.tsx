"use client";

import { useRef, useState } from "react";
import { ImageCropModal } from "@/components/profile/ImageCropModal";
import { compressImageFile } from "@/lib/media/compress-image";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  accept?: string;
  previewUrl?: string;
  previewClassName?: string;
  compress?: boolean;
  enableCrop?: boolean;
  cropAspect?: number;
  cropShape?: "rect" | "round";
  cropOutputWidth?: number;
  cropOutputHeight?: number;
  cropTitleKey?: string;
  cropHintKey?: string;
  onUploaded: (url: string) => void | Promise<void>;
  uploadKind: string;
}

export function ImageUploadField({
  label,
  hint,
  accept = "image/jpeg,image/png,image/webp",
  previewUrl,
  previewClassName,
  compress = true,
  enableCrop = false,
  cropAspect = 1,
  cropShape = "round",
  cropOutputWidth = 512,
  cropOutputHeight = 512,
  cropTitleKey,
  cropHintKey,
  onUploaded,
  uploadKind,
}: ImageUploadFieldProps) {
  const { t } = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  async function uploadDataUrl(dataUrl: string, filename: string) {
    const res = await fetch("/api/profile/upload", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: uploadKind, dataUrl, filename }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? t("profileEdit.uploadFailed"));
    await onUploaded(data.url);
  }

  async function handleFile(file: File) {
    setLoading(true);
    setError("");
    try {
      if (enableCrop && file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        setCropSrc(preview);
        setLoading(false);
        return;
      }

      let dataUrl: string;
      let filename: string;

      if (compress && file.type.startsWith("image/") && file.type !== "image/svg+xml") {
        const { dataUrl: compressed, blob } = await compressImageFile(file);
        dataUrl = compressed;
        filename = `${uploadKind}-${Date.now()}.webp`;
        void blob;
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Read failed"));
          reader.readAsDataURL(file);
        });
        filename = file.name;
      }

      await uploadDataUrl(dataUrl, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileEdit.uploadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCropConfirm(dataUrl: string) {
    setLoading(true);
    setError("");
    try {
      await uploadDataUrl(dataUrl, `${uploadKind}-${Date.now()}.webp`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileEdit.uploadFailed"));
    } finally {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className={cn("rounded-xl border border-slate-200 object-cover", previewClassName)} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? t("profileEdit.uploading") : t("profileEdit.chooseFile")}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={cropAspect}
          cropShape={cropShape}
          outputWidth={cropOutputWidth}
          outputHeight={cropOutputHeight}
          titleKey={cropTitleKey}
          hintKey={cropHintKey}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={async (dataUrl) => {
            await handleCropConfirm(dataUrl);
          }}
        />
      )}
    </div>
  );
}
