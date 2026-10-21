import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cinematic.css";
import "./soundscape.css";

export const metadata: Metadata = {
  title: "未竟 · 与先贤对话",
  description: "把尚未想清楚的事，放在这里。听见不同的思想，与古今中外的先贤继续一场未竟的对话。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#141510" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
