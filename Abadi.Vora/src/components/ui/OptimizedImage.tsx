import Image, { type ImageProps } from "next/image";

const DEFAULT_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=";

interface OptimizedImageProps extends Omit<ImageProps, "placeholder" | "blurDataURL"> {
  lazy?: boolean;
}

export function OptimizedImage({ lazy = true, priority, loading, alt, ...props }: OptimizedImageProps) {
  return (
    <Image
      {...props}
      alt={alt}
      loading={loading ?? (lazy && !priority ? "lazy" : undefined)}
      placeholder="blur"
      blurDataURL={DEFAULT_BLUR}
      sizes={props.sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
    />
  );
}
