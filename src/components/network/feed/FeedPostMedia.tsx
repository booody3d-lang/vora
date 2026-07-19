import type { PostMediaItem } from "@/types/network";

interface FeedPostMediaProps {
  media: PostMediaItem[];
}

export function FeedPostMedia({ media }: FeedPostMediaProps) {
  return (
    <div className="mt-3 space-y-2">
      {media.map((item) => (
        <div
          key={item.url}
          className="flex justify-center overflow-hidden rounded-lg bg-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt=""
            width={item.width && item.width > 0 ? item.width : undefined}
            height={item.height && item.height > 0 ? item.height : undefined}
            className="h-auto max-h-[min(520px,70vh)] w-full max-w-full object-contain"
            style={
              item.width && item.height && item.width > 0 && item.height > 0
                ? { aspectRatio: `${item.width} / ${item.height}` }
                : undefined
            }
            loading="lazy"
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}
