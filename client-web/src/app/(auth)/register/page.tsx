import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account | APEX ATELIER",
  description:
    "Create your APEX ATELIER account to save delivery addresses, track orders and check out faster.",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center text-sm text-[#C4C8D0]">
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
