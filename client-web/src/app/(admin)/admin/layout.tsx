import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Administration | APEX ATELIER",
  description: "APEX ATELIER automotive operations console.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3]">{children}</div>
  );
}
