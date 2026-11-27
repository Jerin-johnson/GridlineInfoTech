import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({
  eyebrow = "ADMINISTRATION",
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
      <div className="space-y-1.5">
        <p className="text-[10px] tracking-[0.26em] uppercase text-[#C81E1E]">
          {eyebrow}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#F5F5F3]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[#A1A1AA]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </header>
  );
}

interface AdminStatCardProps {
  label: string;
  value?: string | number | null;
  hint?: string;
}

export function AdminStatCard({
  label,
  value,
  hint = "Awaiting data module",
}: AdminStatCardProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div className="border border-white/10 bg-[#0D0D0F] p-5 space-y-2.5">
      <p className="text-[10px] tracking-[0.22em] uppercase text-[#A1A1AA]">
        {label}
      </p>
      <p className="text-2xl font-medium text-[#F5F5F3] tabular-nums">
        {hasValue ? value : "—"}
      </p>
      <p className="text-[11px] text-[#71717A]">{hint}</p>
    </div>
  );
}

interface AdminPanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPanel({
  title,
  subtitle,
  actions,
  children,
}: AdminPanelProps) {
  return (
    <section className="border border-white/10 bg-[#0D0D0F] flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="font-serif text-lg font-normal text-[#F5F5F3]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-[#71717A]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-6 flex-1">{children}</div>
    </section>
  );
}

interface AdminEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function AdminEmptyState({
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="border border-white/10 bg-[#080808] p-8 text-center space-y-2.5">
      <p className="text-xs tracking-[0.18em] uppercase text-[#F5F5F3]">
        {title}
      </p>
      <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function AdminStatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/40 text-emerald-400"
      : tone === "warning"
        ? "border-amber-500/40 text-amber-400"
        : tone === "danger"
          ? "border-[#C81E1E]/60 text-[#C81E1E]"
          : "border-white/15 text-[#A1A1AA]";

  return (
    <span
      className={`inline-block border px-2 py-0.5 text-[10px] tracking-[0.16em] uppercase ${toneClass}`}
    >
      {label}
    </span>
  );
}

export function AdminLoadingState({
  label = "Verifying administrator session...",
}: {
  label?: string;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex items-center justify-center p-6">
      <div className="border border-white/10 bg-[#0D0D0F] p-8 w-full max-w-md text-center space-y-4">
        <div className="w-7 h-7 mx-auto border border-white/15 border-t-[#C81E1E] animate-spin motion-reduce:animate-none" />
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#A1A1AA]">
          {label}
        </p>
      </div>
    </div>
  );
}

export function AdminErrorState({
  title = "Console Unavailable",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3] flex items-center justify-center p-6">
      <div
        role="alert"
        className="border border-white/10 border-l-2 border-l-[#C81E1E] bg-[#0D0D0F] p-8 w-full max-w-md space-y-4"
      >
        <p className="text-[10px] tracking-[0.24em] uppercase text-[#C81E1E]">
          System Notice
        </p>
        <h1 className="font-serif text-2xl font-normal text-[#F5F5F3]">
          {title}
        </h1>
        <p className="text-sm text-[#A1A1AA]">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="bg-[#C81E1E] hover:bg-[#A61717] text-[#F5F5F3] px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors cursor-pointer min-h-[44px]"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
