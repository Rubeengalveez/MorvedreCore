import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Morvedre Core",
  description: "La app del Waterpolo Morvedre",
  applicationName: "Morvedre Core",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Morvedre",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Morvedre Core",
    title: "Morvedre Core",
    description: "La app del Waterpolo Morvedre",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: true,
  themeColor: "#0A2E5C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  if (${JSON.stringify(process.env.NODE_ENV !== "production")}) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      return Promise.all(registrations.map(function(registration) {
                        return registration.unregister();
                      })).then(function(results) {
                        return results.some(Boolean);
                      });
                    }).then(function(unregistered) {
                      return caches.keys().then(function(cacheNames) {
                        return Promise.all(cacheNames.map(function(cacheName) {
                          return caches.delete(cacheName);
                        }));
                      }).then(function() {
                        return unregistered;
                      });
                    }).then(function(unregistered) {
                      if (unregistered) {
                        window.location.reload();
                      }
                    }).catch(function(error) {
                      console.warn('[SW] Development cleanup failed:', error);
                    });
                    return;
                  }

                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('[SW] Registered:', registration.scope);
                    registration.update();
                  }).catch(function(error) {
                    console.error('[SW] Registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-paper text-ink-900 min-h-dvh font-sans antialiased">
        <a
          href="#main-content"
          className="focus:bg-pool-deep focus:text-paper focus:shadow-elev-4 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
