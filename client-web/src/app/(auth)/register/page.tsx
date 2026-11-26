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
        <div className="py-12 text-center text-sm text-[#A0A4AE]">
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
