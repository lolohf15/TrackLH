import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
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
  themeColor: "#000000",
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
      <body className={`${archivo.variable} ${ibmPlexMono.variable} ${archivo.className}`}>
        {/* The shell now lives in the (app) route group, so signed-out and
            onboarding screens render without a tab bar. */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
