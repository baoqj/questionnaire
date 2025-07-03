import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CRS Check - 合规风险自测',
  description: '跨境合规智能分析 AI - 你真的了解自己的CRS合规风险吗？',
  keywords: 'CRS, 合规, 风险评估, 跨境, 税务',
  authors: [{ name: 'Knowcore AI' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#7C3AED',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#7C3AED" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
          {children}
        </div>
      </body>
    </html>
  );
}
