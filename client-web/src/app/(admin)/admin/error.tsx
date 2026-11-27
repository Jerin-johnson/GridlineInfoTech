"use client";

import { AdminErrorState } from "@/components/admin/AdminPrimitives";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AdminErrorState
      title="Administration Error"
      message={
        error.message ||
        "An unexpected error occurred while loading the administration console."
      }
      onRetry={reset}
    />
  );
}
