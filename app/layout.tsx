import { SITE_URL } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { Chrome } from "@/components/chrome";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: "L’Amour · Tu intimidad, a tu manera",
    template: "%s | L’Amour",
  },
  description:
    "Boutique íntima en Paraguay. Bienestar, diseño y discreción. Explorá nuestra selección y productos por pedido.",
  icons: { icon: "/favicon.ico", apple: "/app_icon_192x192.png" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "L’Amour",
    description: "Más que un placer, un espacio para ti.",
    locale: "es_PY",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "L’Amour",
    description: "Bienestar íntimo, diseño y discreción.",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#420a25",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-PY">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&amp;family=Montserrat:wght@400;500;600&amp;family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&amp;display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "L’Amour",
              url: SITE_URL,
              logo: SITE_URL + "/brand/symbol-ivory.webp",
            }).replace(/</g, "\\u003c"),
          }}
        />
        <StoreProvider>
          <Chrome>{children}</Chrome>
        </StoreProvider>
      </body>
    </html>
  );
}
