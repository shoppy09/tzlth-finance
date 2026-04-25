import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "財務系統 | 職涯停看聽",
  description: "職涯停看聽內部財務記帳系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-white">💰 財務系統</span>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">總覽</a>
          <a href="/income" className="text-sm text-gray-400 hover:text-white transition-colors">收入</a>
          <a href="/expense" className="text-sm text-gray-400 hover:text-white transition-colors">支出</a>
          <div className="ml-auto text-xs text-gray-600">職涯停看聽</div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
