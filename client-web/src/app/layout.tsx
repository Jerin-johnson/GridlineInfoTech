import type { Metadata } from "next";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { Web3Provider } from "@/components/providers/Web3Provider";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "APEX ATELIER | Precision Automotive Accessories",
  description:
    "Single-vendor luxury automotive accessories, forged wheels, titanium exhausts, and bespoke aero with verified crypto checkout.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bodoni.variable} ${jakarta.variable} dark`}>
      <body className="bg-[#080808] text-[#F5F5F3] font-sans antialiased selection:bg-[#C81E1E] selection:text-white overflow-x-hidden">
        <Web3Provider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
