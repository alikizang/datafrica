import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import { NotificationsProvider } from "@/hooks/use-notifications";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AntiScrape } from "@/components/anti-scrape";
import { GoogleOneTap } from "@/components/google-one-tap";
import { PageTracker } from "@/components/analytics/page-tracker";
import { MaintenanceGuard } from "@/components/maintenance-guard";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Datafrica - African Dataset Marketplace",
  description:
    "The premier marketplace for African datasets. Browse, preview, and purchase business data, leads, contacts, and more across the continent.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col no-select">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              <NotificationsProvider>
              <MaintenanceGuard>
              <AntiScrape />
              <GoogleOneTap />
              <PageTracker />
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster />
              </MaintenanceGuard>
              </NotificationsProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
