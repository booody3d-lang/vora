import "server-only";

import sharp from "sharp";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
  ext: "webp";
}

export interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
}

const DEFAULTS: Required<ProcessImageOptions> = {
  maxDimension: 1920,
  quality: 85,
};

/** Resize inside max bounds, preserve aspect ratio, output WebP. */
export async function processFeedImage(
  input: Buffer,
  options: ProcessImageOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULTS, ...options };
  const pipeline = sharp(input).rotate().resize(opts.maxDimension, opts.maxDimension, {
    fit: "inside",
    withoutEnlargement: true,
  });

  const buffer = await pipeline.webp({ quality: opts.quality }).toBuffer();
  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    mimeType: "image/webp",
    ext: "webp",
  };
}

export async function processAvatarImage(input: Buffer): Promise<ProcessedImage> {
  const buffer = await sharp(input)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "centre" })
    .webp({ quality: 88 })
    .toBuffer();

  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    width: meta.width ?? 512,
    height: meta.height ?? 512,
    mimeType: "image/webp",
    ext: "webp",
  };
}
