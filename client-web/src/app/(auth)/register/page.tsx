import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account | APEX ATELIER",
  description:
    "Register for an APEX ATELIER account to curate automotive hardware, save delivery addresses, and track verified orders.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="New Registration"
      title="Create Account"
      subtitle="Establish your client profile for bespoke automotive hardware and tracked delivery."
      editorialTitle="Join the"
      editorialHighlight="Atelier."
      editorialDescription="Unlock direct allocations from Brembo, Akrapovič, BBS Motorsport, and Öhlins with server-verified Web3 settlement."
      editorialImage="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=85"
      editorialImageAlt="Carbon fiber aerodynamic automotive detailing in dark studio"
    >
      <Suspense
        fallback={
          <div className="py-12 text-center text-xs tracking-[0.2em] uppercase text-zinc-500">
            Loading...
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
