import type { Metadata, Viewport } from "next";
import { COMPANY_NAME } from "@/lib/constants";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${COMPANY_NAME} ERP`,
    template: `%s | ${COMPANY_NAME}`,
  },
  description: `${COMPANY_NAME} ERP for printer colours, ink, toner, cartridges, inventory, invoicing and receivables.`,
  applicationName: COMPANY_NAME,
  authors: [{ name: COMPANY_NAME }],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: `${COMPANY_NAME} ERP`,
    description: `${COMPANY_NAME} inventory, invoicing and receivables ERP.`,
    siteName: COMPANY_NAME,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A8A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
