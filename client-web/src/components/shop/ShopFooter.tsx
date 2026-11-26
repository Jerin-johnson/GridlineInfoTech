import Link from "next/link";

export function ShopFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#080808] py-8 px-5 sm:px-8 md:px-12">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[0.24em] uppercase text-[#F5F5F3]">
            APEX ATELIER
          </span>
          <span aria-hidden="true" className="text-zinc-700">
            ·
          </span>
          <span>Single-vendor performance hardware</span>
        </div>

        <nav
          aria-label="Catalogue footer"
          className="flex items-center gap-6 text-zinc-400"
        >
          <Link href="/" className="hover:text-[#F5F5F3] transition-colors">
            Home
          </Link>
          <Link
            href="/shop"
            className="hover:text-[#F5F5F3] transition-colors"
          >
            Catalogue
          </Link>
          <Link
            href="/login"
            className="hover:text-[#F5F5F3] transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
