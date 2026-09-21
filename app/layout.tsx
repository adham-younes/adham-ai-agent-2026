import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "adham.ai | منظومة الوكلاء التنفيذية الذكية",
  description: "منظومة ذكاء اصطناعي متعددة الوكلاء (120B + 2×27B) للبرمجة، إدارة قواعد البيانات، والنشر السحابي مدعومة بمعالجات Groq LPU.",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

// The page and Eve routes validate the generated app's Better Auth session.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, mono.variable)} dir="rtl" lang="ar">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
