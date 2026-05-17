import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnimeFlow AI 影视生产平台",
  description: "面向 AI 影视生产全流程的专业内容工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
