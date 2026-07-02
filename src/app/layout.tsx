import type { Metadata } from "next";
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
    <html lang="en">
      <body className="bg-[color:var(--background)] text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
