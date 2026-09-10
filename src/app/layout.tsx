import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { RoommateProvider } from "@/contexts/CurrentRoommateContext";
import "./globals.css";

const heading = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RoomOS",
  description: "The apartment operating system for five roommates.",
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
      className={`${heading.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <RoommateProvider>
          <AppShell>{children}</AppShell>
        </RoommateProvider>
        <Toaster />
      </body>
    </html>
  );
}
