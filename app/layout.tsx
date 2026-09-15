import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "TrackLH",
  description: "Tu dashboard personal de finanzas",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    // Lets the app paint under the status bar, so the dark chrome runs edge to edge.
    statusBarStyle: "black-translucent",
    title: "TrackLH",
  },
};

export const viewport: Viewport = {
  themeColor: "#151412",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to report real values on iOS — without
  // it the tab bar and the add button ignore the home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Runs before first paint: a saved light preference has to be on the
            element already, or the app flashes dark on every load. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        {/* The shell now lives in the (app) route group, so signed-out and
            onboarding screens render without a tab bar. */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
