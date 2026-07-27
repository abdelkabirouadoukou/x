import { useEffect } from "react";

interface HeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  children?: React.ReactNode;
}

export default function Head({ title, description, ogImage, ogType, children }: HeadProps) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(name.startsWith("og:") ? "property" : "name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    if (description) setMeta("description", description);
    if (ogImage) setMeta("og:image", ogImage);
    if (ogType) setMeta("og:type", ogType);
    if (description) setMeta("og:description", description);
    setMeta("og:title", title);
  }, [title, description, ogImage, ogType]);

  return <>{children}</>;
}
