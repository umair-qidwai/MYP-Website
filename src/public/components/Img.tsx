import { useState, type CSSProperties } from "react";
import type { ImageRef } from "@shared/blocks";

/**
 * Responsive image with intrinsic size (prevents layout shift), srcset from stored variants,
 * lazy loading by default and a soft fade-in.
 */
export function Img({
  image,
  sizes = "100vw",
  className = "",
  priority = false,
  fit,
  style,
  alt,
}: {
  image: ImageRef;
  sizes?: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  style?: CSSProperties;
  alt?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const srcSet = image.variants?.length
    ? [...image.variants.map((v) => `${v.src} ${v.w}w`), image.width ? `${image.src} ${image.width}w` : null].filter(Boolean).join(", ")
    : undefined;
  return (
    <img
      src={image.src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt ?? image.alt ?? ""}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      onLoad={() => setLoaded(true)}
      ref={(el) => {
        if (el?.complete) setLoaded(true);
      }}
      className={`${fit === "cover" ? "h-full w-full object-cover" : fit === "contain" ? "h-full w-full object-contain" : ""} transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      style={style}
    />
  );
}
