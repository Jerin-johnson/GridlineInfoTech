<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# APEX ATELIER — Frontend Engineering Agent Guide

## Project Context

Single-vendor luxury automotive accessories e-commerce storefront (alloy wheels, titanium exhausts, carbon aero, lighting, interior, performance parts) with a dark editorial aesthetic and verified testnet crypto checkout.

**Mandatory:** Before creating or modifying any customer-facing UI, read and strictly follow `.agents/skills/frontend-design-system/SKILL.md` to maintain 100% visual and motion consistency with the landing page.

---

## Tech Stack & Architecture

- **Framework:** Next.js (App Router) + strict TypeScript (`strict: true`, zero `any`).
- **Styling:** Tailwind CSS v4 + design tokens in `src/app/globals.css`.
- **Typography:** `Cormorant Garamond` (`--font-serif`) for display/editorial headlines, `Inter` (`--font-sans`) for UI, specs, prices, and micro-labels.
- **Motion:** GSAP (`gsap` + `@gsap/react`) + `lenis` for smooth scroll.
- **3D:** Three.js / React Three Fiber (`@react-three/fiber`, `@react-three/drei`) for meaningful automotive hardware showcases only.
- **Icons:** `lucide-react` (thin, crisp stroke icons; never use emoji as UI icons).

---

## Folder Conventions

```text
src/
├── app/
│   ├── (storefront)/           # Customer routes: /, /shop, /products/[slug], /cart, /checkout, /account
│   ├── (auth)/                 # /login, /register
│   ├── admin/                  # Protected admin routes (separate layout, denser utility UI)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── landing/                # Homepage sections
│   ├── storefront/             # Reusable shop cards, filters, cart drawer, wallet pill, order timeline
│   ├── motion/                 # SmoothScrollProvider, RevealText, GSAP wrappers
│   └── ui/                     # Primitives: AtelierButton, HairlineInput, Badge, Modal, Skeleton
├── config/
│   └── homepage.ts             # Static editorial copy ONLY (never hard-code catalogue products)
├── lib/
│   ├── api/                    # Typed API clients (server & client)
│   └── web3/                   # Wallet config, supported testnet chain, contract/payment helpers
└── types/                      # Shared TypeScript interfaces matching backend DTOs
```
