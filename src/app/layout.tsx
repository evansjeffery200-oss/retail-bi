import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retail BI",
  description: "Sales, stock, expenses and profit in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
