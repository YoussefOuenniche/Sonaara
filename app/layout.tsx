import type { Metadata } from "next";
import "./globals.css";
import { TimezoneSync } from "@/components/TimezoneSync";

export const metadata: Metadata = {
  title: "Sonaara",
  description: "Your music, distilled.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
