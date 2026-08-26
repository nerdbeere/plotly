import type { Metadata } from "next";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "GardenPlot - Smart Garden Manager",
  description: "Web-based garden reminder app with Home Assistant integration and gamification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <Header />
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
