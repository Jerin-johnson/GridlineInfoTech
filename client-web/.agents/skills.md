---
## 2. `SKILL.md` (Frontend Design System & Styling Skill)
---

name: frontend-design-system
description: Visual design system, dark luxury typography, component patterns, GSAP motion language, and e-commerce UI specifications for APEX ATELIER. Use whenever building or styling any customer-facing page or component (/shop, /products/[slug], /cart, /checkout, /account, /login).

---

# APEX ATELIER — Frontend Design System & Styling Skill

Every customer-facing page MUST feel like a direct continuation of the obsidian editorial landing page—restrained, architectural, high-contrast, and precision-engineered. Avoid generic SaaS rounded cards, bright gradients, or cluttered e-commerce badges.

---

## 1. Color Palette & Surface Hierarchy

| Role                       | Token / Hex                                  | Usage                                                                                   |
| :------------------------- | :------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **Canvas (Primary BG)**    | `#080808`                                    | Global page background, sticky panels, drawers                                          |
| **Elevated Surface**       | `#0D0D0F`                                    | Product cards, checkout summary panels, modals                                          |
| **Subtle Surface**         | `#141417`                                    | Input fills, active filter chips, table headers                                         |
| **Primary Ink**            | `#F5F5F3`                                    | Display headings, prices, active labels                                                 |
| **Secondary Ink**          | `#A1A1AA` (`zinc-400`)                       | Body copy, descriptions, fitment text                                                   |
| **Muted Ink**              | `#71717A` (`zinc-500`)                       | Overlines, SKUs, metadata, disabled states                                              |
| **Hairline Border**        | `rgba(255,255,255,0.10)` (`border-white/10`) | Default structural dividers & card frames                                               |
| **Interactive Border**     | `rgba(255,255,255,0.30)` (`border-white/30`) | Hover states on cards, inputs, ghost buttons                                            |
| **Brand Accent (Crimson)** | `#C81E1E`                                    | Active indicators, brake-caliper accents, wallet dot, cart count badge, critical alerts |
| **Semantic Success**       | `#10B981` (`emerald-500`)                    | Verified on-chain payment, in-stock dot                                                 |
| **Semantic Warning**       | `#F59E0B` (`amber-500`)                      | Low stock, wrong network, pending confirmation                                          |

### Strict Surface Rules

- **Sharp architectural geometry:** Use `rounded-none` (0px) on cards, buttons, inputs, drawers, and modals. Only tiny status dots or cart counters may use `rounded-full`.
- **No heavy drop shadows:** Separate layers with `1px` hairlines (`border-white/10`) and subtle background value shifts (`#080808` -> `#0D0D0F`).
- **Carbon grain:** Apply `.bg-noise` on full-bleed dark editorial sections, drawers, and empty states.

---

## 2. Typography Scale & Pairing

Always pair **Cormorant Garamond** (`font-serif`) with **Inter** (`font-sans`).

| Element                          | Classes                                                                                                        |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Hero / Display H1**            | `font-serif text-5xl sm:text-7xl md:text-[5.5rem] font-light leading-[0.98] tracking-[-0.02em] text-[#F5F5F3]` |
| **Page / Section H2**            | `font-serif text-4xl md:text-6xl font-light leading-[1.04] tracking-tight text-[#F5F5F3]`                      |
| **Card / Subheading H3**         | `font-serif text-2xl font-light leading-snug text-[#F5F5F3]`                                                   |
| **Editorial Metallic Title**     | Add `.text-metallic .text-metallic-active` for signature section headers                                       |
| **Micro Overline / Eyebrow**     | `text-[10px] tracking-[0.28em] uppercase text-zinc-400` (or `text-[#C81E1E]` for highlights)                   |
| **UI Label / Nav / Button**      | `text-[11px] tracking-[0.22em] uppercase`                                                                      |
| **Body Copy**                    | `text-sm text-zinc-400 leading-relaxed`                                                                        |
| **Numeric / Price / Hash / SKU** | `font-sans tabular-nums text-[#F5F5F3]` (use `font-mono text-xs` for wallet addresses & tx hashes)             |

---

## 3. Core Component Patterns

### Buttons

- **Primary / Ghost Luxury CTA (`.btn-atelier`):**
  `border border-white/20 px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase text-[#F5F5F3] hover:bg-[#F5F5F3] hover:text-[#080808] hover:border-[#F5F5F3] transition-colors`
- **High-Intent Solid CTA (Add to Cart / Confirm Payment):**
  `bg-[#F5F5F3] text-[#080808] px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed`
- **Destructive / Disconnect:**
  `border border-[#C81E1E]/40 text-[#C81E1E] hover:bg-[#C81E1E] hover:text-white`

### Form Inputs & Selects

- Dark hairline style:
  `w-full bg-[#0D0D0F] border border-white/15 px-4 py-3 text-sm text-[#F5F5F3] placeholder:text-zinc-600 focus:border-white/60 focus:outline-none transition-colors`
- Labels sit above inputs in micro-overline style: `text-[10px] tracking-[0.22em] uppercase text-zinc-400 mb-2 block`.

### Product Card (`/shop` & Related Products)

- Container: `border border-white/10 bg-[#0D0D0F] hover:border-white/30 transition-colors flex flex-col`
- Media: `aspect-[4/3] overflow-hidden bg-black` with `group-hover:scale-105 transition-transform duration-700`.
- Top-left badge: `bg-black/75 border border-white/10 px-2.5 py-1 text-[9px] tracking-[0.2em] uppercase` (`In Stock`, `Low Stock`, or `Out of Stock` with muted opacity).
- Body: `brand · category` overline -> `font-serif text-2xl` title -> concise fitment line -> hairline footer with `tabular-nums` price and `Configure` / `Quick Add` action.

---

## 4. Page-Specific Layout Blueprints

### A. Product Discovery (`/shop`)

- **Top Editorial Header:** Compact dark banner (`pt-32 pb-12 border-b border-white/10`) with serif title, live result count, and search input.
- **Layout:** Desktop 12-column split — `lg:col-span-3` sticky filter rail (Category, Brand, Price range, Availability toggle) separated by `border-r border-white/10`; `lg:col-span-9` 3-column product grid + top sort bar (`Featured`, `Price: Low–High`, `Price: High–Low`, `Newest`) and bottom pagination.
- **Mobile:** Slide-over filter drawer triggered by a hairline `Filters` button.

### B. Product Detail Page (`/products/[slug]`)

- **Above the Fold:** 12-column split — `lg:col-span-7` dark studio gallery (main `4/3` image with click-to-zoom lightbox + thumbnail strip + optional `3D View` toggle if model exists); `lg:col-span-5` sticky purchase column.
- **Purchase Column:** Brand/Category overline, `font-serif text-4xl md:text-5xl` title, SKU & stock badge, price, short description, fitment compatibility box (`border border-white/10 bg-[#0D0D0F] p-4`), quantity stepper (`- 1 +`), and full-width Solid `Add to Cart` CTA (disabled with clear `Out of Stock` label when stock is `0`).
- **Below the Fold:** Hairline technical specifications table (2-column key/value grid) + `Related Hardware` 4-column strip.

### C. Cart (`/cart`) & Slide-Over Drawer

- Clean hairline line-item rows (thumbnail, title, brand, unit price, quantity stepper, remove button, line subtotal).
- Right-hand sticky `Order Summary` card (`bg-[#0D0D0F] border border-white/10 p-6`) showing subtotal, shipping/fees, estimated total, and `Proceed to Crypto Checkout` CTA.

### D. Crypto Checkout (`/checkout`)

- Two-column layout: Left = shipping address form (or saved address selector) + **Web3 Payment Module**; Right = locked `Order Summary`.
- **Web3 Payment Module Structure:**
  1. **Wallet Status Header:** Connected pill (`emerald` dot + shortened `0x...` + network name + `Disconnect`) OR `Connect Wallet` button.
  2. **Network Guard Banner:** If chain ID mismatches configured testnet, show an amber-bordered warning box with a 1-click `Switch to <Testnet>` button.
  3. **Payment Breakdown Box:** Monospace display of exact payable amount, token symbol, network, and shortened destination contract/treasury address with copy button.
  4. **Live Transaction Stepper:** Visual status bar cycling through `Approve in Wallet` -> `Broadcasted (Tx Hash Link)` -> `Verifying On-Chain (Server)` -> `Payment Confirmed`.
  5. **Recovery States:** Clear retry messaging for user-rejected signatures, reverted transactions, underpayment, or expired quotes.

### E. Account & Order Tracking (`/account/orders/[id]`)

- Vertical or horizontal hairline **Order Tracking Timeline** covering:
  `Placed` -> `Payment Confirmed` -> `Processing` -> `Shipped` -> `Out for Delivery` -> `Delivered` (with `Cancelled` crimson branch).
- Completed steps use solid `#F5F5F3` nodes; active step pulses `#C81E1E`; future steps use `border-white/20`.
- Display immutable order item snapshots, shipping address snapshot, payment verification status badge, and clickable block-explorer link for the transaction hash.

---

## 5. Motion & Interaction Standards

- **Easing:** Use `power3.out` / `power4.out` for entrances (`0.6s–1.0s`), `power2.inOut` for drawers/overlays. Never use bouncy/elastic easing.
- **Micro-interactions:** Subtle `scale-105` (`duration-700`) on imagery, `border-white/10` -> `border-white/30` on cards, horizontal hairline underline reveals on links.
- **Scroll Discipline:** Reserve pinned `ScrollTrigger` choreography for the landing page; keep `/shop`, `/cart`, `/checkout`, and `/account` snappy and zero-friction for conversion.
- **Reduced Motion:** Always respect `prefers-reduced-motion: reduce` by skipping parallax/pins and rendering content immediately at `opacity: 1`.

---

## 6. Agent Pre-Flight Checklist (Run Before Finishing Any Task)

- [ ] Matches `#080808` / `#0D0D0F` / `#F5F5F3` / `#C81E1E` palette with zero off-brand rounded pills or default blue focus/button styles.
- [ ] Uses `font-serif` for display headings and `font-sans` with `tabular-nums` for UI/pricing.
- [ ] Includes Loading, Empty, Error, and Success states.
- [ ] Responsive across `375px` mobile, `768px` tablet, `1280px` laptop, and `1536px` desktop.
- [ ] Zero hard-coded catalogue arrays; wired to typed API layer.
- [ ] GSAP cleaned up via `useGSAP` and wrapped in `prefers-reduced-motion` guard.
