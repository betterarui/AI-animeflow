import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnimeFlow AI 漫剧生产平台",
  description: "面向 AI 漫剧生产全流程的专业内容生产工作台"
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
