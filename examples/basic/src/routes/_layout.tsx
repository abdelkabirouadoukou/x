import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <a href="/" style={{ fontWeight: 700, fontSize: "1rem" }}>x</a>
        <a href="/about">About</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/posts">Posts</a>
      </nav>
      <main>{children}</main>
    </>
  );
}
