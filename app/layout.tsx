import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CourseCraft — Constraint-based schedule planner",
  description: "Generate, compare, save, and export ranked course schedules around your real constraints.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
