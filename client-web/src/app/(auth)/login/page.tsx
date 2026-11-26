import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | APEX ATELIER",
  description:
    "Sign in to your APEX ATELIER account to manage saved fitments, track orders, and complete verified crypto checkout.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Client Access"
      title="Sign In"
      subtitle="Access your saved delivery addresses, order tracking timeline, and verified checkout."
      editorialTitle="Precision"
      editorialHighlight="Access."
      editorialDescription="Enter the APEX ATELIER client portal to track live fulfilment milestones, manage vehicle fitments, and settle orders on Sepolia."
      editorialImage="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1600&q=85"
      editorialImageAlt="Dark luxury performance coupe in obsidian studio lighting"
    >
      <Suspense
        fallback={
          <div className="py-12 text-center text-xs tracking-[0.2em] uppercase text-zinc-500">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
