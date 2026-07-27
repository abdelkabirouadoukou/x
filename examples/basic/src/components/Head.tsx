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
      <meta property="og:title" content={title} />
      {description && <meta name="description" content={description} />}
      {description && <meta property="og:description" content={description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogType && <meta property="og:type" content={ogType} />}
      {children}
    </>
  );
}
