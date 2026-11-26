import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | APEX ATELIER",
  description:
    "Sign in to your APEX ATELIER account to track orders, manage fitments and check out faster.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center text-sm text-[#C4C8D0]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
