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
                  const swUrl = ${JSON.stringify(process.env.NODE_ENV === "production" ? "/sw.js" : "/sw-dev.js")};
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    var dirty = false;
                    regs.forEach(function(r) {
                      if (r.scope.includes(window.location.origin) && r.active && r.active.scriptURL !== (window.location.origin + swUrl)) {
                        r.unregister();
                        dirty = true;
                      }
                    });
                    if (dirty) {
                      console.log('[SW] Old service worker unregistered. Reloading...');
                      window.location.reload();
                      return;
                    }
                    navigator.serviceWorker.register(swUrl).then(function(reg) {
                      console.log('[SW] Registered:', reg.scope);
                      reg.update();
                    }).catch(function(err) {
                      console.error('[SW] Registration failed:', err);
                    });
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
          className="focus:bg-pool-deep focus:text-paper sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-elev-4"
        >
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
