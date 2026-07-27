interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  className?: string;
}

export default function Image({ src, alt, width, height, lazy = true, className }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      className={className}
      style={{
        maxWidth: "100%",
        height: "auto",
        ...(width && height ? { aspectRatio: `${width}/${height}` } : {}),
      }}
    />
  );
}
