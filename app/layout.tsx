import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "canvas-node-03gx",
  description: "make me a chess app using nextjs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
