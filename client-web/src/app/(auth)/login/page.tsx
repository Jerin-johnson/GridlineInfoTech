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
        <div className="py-12 text-center text-sm text-[#A0A4AE]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
