import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "テスラ相性チェッカー | あなたが惹かれる、クルマの未来",
  description:
    "好みや体験を書くだけで、Teslaの製品体験への共感をJevが5つの観点からチェックします。",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
