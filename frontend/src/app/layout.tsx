import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThinkingEngine Data Generator",
  description: "이벤트 데이터 생성 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
