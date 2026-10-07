import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "daymark — make room for what matters",
  description: "A calm, private space to plan your day and keep your tasks moving.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
