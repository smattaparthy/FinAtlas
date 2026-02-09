import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "FinAtlas",
  description: "Privacy-first financial planning with AI-powered scenario modeling",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinAtlas",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("finatlas_preferences");var t=s?JSON.parse(s).theme:"dark";if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t||"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`,
          }}
        />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
