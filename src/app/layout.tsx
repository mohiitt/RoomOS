import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { RoommateProvider } from "@/contexts/CurrentRoommateContext";
import "./globals.css";

const sans = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RoomOS",
  description: "The apartment operating system for five roommates.",
  applicationName: "RoomOS",
  appleWebApp: {
    capable: true,
    title: "RoomOS",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C45C26",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <RoommateProvider>
            <OfflineBanner />
            <AppShell>{children}</AppShell>
          </RoommateProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
