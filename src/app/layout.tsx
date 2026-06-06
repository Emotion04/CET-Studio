import type { Metadata } from "next";
import { ToastContainer } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "CET Studio — 四六级备考练习",
  description: "原创 CET-style 仿真模拟训练平台，覆盖写作、翻译、阅读、听力和学习规划。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark')}else if(t==='light'){d.classList.add('light')}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}<ToastContainer /></body>
    </html>
  );
}
