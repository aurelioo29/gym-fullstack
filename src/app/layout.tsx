import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import { GymInfo } from "@/database/models";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const gymInfo = await GymInfo.findOne({
      order: [["createdAt", "ASC"]],
    });

    const appName = gymInfo?.name || "Gym Management System";
    const description =
      gymInfo?.description ||
      gymInfo?.tagline ||
      "Modern gym management system for admins, trainers, and customers.";

    const faviconUrl = gymInfo?.faviconUrl || "/favicon.ico";

    return {
      title: {
        default: appName,
        template: `%s | ${appName}`,
      },
      description,
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
      openGraph: {
        title: appName,
        description,
        siteName: appName,
        type: "website",
        images: gymInfo?.logoUrl
          ? [
              {
                url: gymInfo.logoUrl,
                alt: appName,
              },
            ]
          : undefined,
      },
    };
  } catch (error) {
    console.error("Generate metadata error:", error);

    return {
      title: {
        default: "Gym Management System",
        template: "%s | Gym Management System",
      },
      description:
        "Modern gym management system for admins, trainers, and customers.",
      icons: {
        icon: "/favicon.ico",
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
