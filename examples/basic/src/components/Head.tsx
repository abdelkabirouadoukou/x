interface HeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  children?: React.ReactNode;
}

export default function Head({ title, description, ogImage, ogType, children }: HeadProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="og:title" content={title} />
      {description && <meta name="description" content={description} />}
      {description && <meta name="og:description" content={description} />}
      {ogImage && <meta name="og:image" content={ogImage} />}
      {ogType && <meta name="og:type" content={ogType} />}
      {children}
    </>
  );
}
