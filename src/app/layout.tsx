import type { Metadata } from "next";
import { ThemeScript } from "../features/theme/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "Subscription billing runner demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-canvas text-content antialiased">{children}</body>
    </html>
  );
}
