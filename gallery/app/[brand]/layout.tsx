import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { BRANDS, isBrand } from "../../brands";
import "../globals.css";
import "../../brands/workforce.css";
import "../../brands/finaops.css";
import "../../brands/prefab.css";
import "../../fonts/glyphs.css";

export const metadata: Metadata = { title: "@latro/ops-ui gallery" };

export const dynamicParams = false;

export function generateStaticParams() {
  return BRANDS.map((brand) => ({ brand }));
}

/**
 * The root layout. The brand sits on <html> because <html> IS :root, where the
 * apps set their --brand-* variables (custom properties inherit substituted
 * values, so a subtree would not re-theme anything). Geist comes from the geist
 * package through next/font/local, and the one glyph Geist lacks from gallery/fonts, so a shot
 * never fetches a font or paints one from the host.
 */
export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  if (!isBrand(brand)) notFound();
  return (
    <html lang="en" data-brand={brand} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
