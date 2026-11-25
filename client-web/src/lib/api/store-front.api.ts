import type { LandingPageData } from "@/types/store-front.types";

const FALLBACK_SEED_DATA: LandingPageData = {
  brands: [
    {
      id: "b1",
      name: "BREMBO",
      slug: "brembo",
      tagline: "Carbon-Ceramic Braking",
    },
    {
      id: "b2",
      name: "AKRAPOVIČ",
      slug: "akrapovic",
      tagline: "Titanium Exhaust Systems",
    },
    {
      id: "b3",
      name: "BBS MOTORSPORT",
      slug: "bbs",
      tagline: "Forged Monoblock Wheels",
    },
    { id: "b4", name: "ÖHLINS", slug: "ohlins", tagline: "Track Suspension" },
    {
      id: "b5",
      name: "VORSTEINER",
      slug: "vorsteiner",
      tagline: "Autoclave Carbon Aero",
    },
  ],
  categories: [
    {
      id: "c1",
      name: "Bodystyling",
      slug: "bodystyling",
      description:
        "Pre-preg autoclave carbon splitters, diffusers, and aero profiles sculpted for downforce and factory-grade panel alignment.",
      image:
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1400&q=85",
      productCount: 18,
    },
    {
      id: "c2",
      name: "Interior",
      slug: "interior",
      description:
        "Alcantara steering architectures, dry-carbon trim inlays, and billet shift paddles crafted for tactile driver connection.",
      image:
        "https://images.unsplash.com/photo-1503736334956-4c8f8e929460?auto=format&fit=crop&w=1400&q=85",
      productCount: 14,
    },
    {
      id: "c3",
      name: "Lighting",
      slug: "lighting",
      description:
        "Laser-etched matrix headlamp assemblies and OLED tail light signatures engineered for unmistakable night presence.",
      image:
        "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1400&q=85",
      productCount: 9,
    },
    {
      id: "c4",
      name: "Exhaust",
      slug: "exhaust",
      description:
        "Grade-5 titanium valved cat-back systems tuned for unmistakable acoustic resonance and significant rear-axle weight reduction.",
      image:
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1400&q=85",
      productCount: 12,
    },
    {
      id: "c5",
      name: "Alloy Wheels",
      slug: "wheels",
      description:
        "T6-6061 aerospace forged monoblock and center-lock wheels machined to exact brake-clearance and stance specifications.",
      image:
        "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?auto=format&fit=crop&w=1400&q=85",
      productCount: 24,
    },
  ],
  featuredProducts: [
    {
      id: "p1",
      name: 'FI-R Evo Center-Lock 21" Forged Set',
      slug: "bbs-fi-r-evo-21",
      sku: "BBS-FIR-21-SBK",
      brandName: "BBS Motorsport",
      categoryName: "Alloy Wheels",
      price: 8950,
      stock: 4,
      image:
        "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?auto=format&fit=crop&w=900&q=85",
      fitment: "Porsche 911 (992 GT3 / Turbo S)",
    },
    {
      id: "p2",
      name: "Slip-On Line Titanium Valved Exhaust",
      slug: "akrapovic-titanium-slip-on",
      sku: "AKR-TI-992-V",
      brandName: "Akrapovič",
      categoryName: "Exhaust",
      price: 6420,
      stock: 6,
      image:
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=85",
      fitment: "BMW M3/M4 (G80/G82) & 992",
    },
    {
      id: "p3",
      name: "GT-R 6-Piston Monoblock Carbon Brake Kit",
      slug: "brembo-gtr-6-piston",
      sku: "BRM-GTR-380-R",
      brandName: "Brembo",
      categoryName: "Performance",
      price: 5280,
      stock: 2,
      image:
        "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=900&q=85",
      fitment: "Universal Track Chassis / AMG GT",
    },
    {
      id: "p4",
      name: "VRS Aero Dry-Carbon Rear Diffuser",
      slug: "vorsteiner-vrs-diffuser",
      sku: "VOR-VRS-CF04",
      brandName: "Vorsteiner",
      categoryName: "Bodystyling",
      price: 3190,
      stock: 9,
      image:
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=85",
      fitment: "Mercedes-AMG G63 / BMW M4",
    },
  ],
};

export async function getLandingPageData(): Promise<LandingPageData> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return FALLBACK_SEED_DATA;

  try {
    const [brandsRes, categoriesRes, productsRes] = await Promise.all([
      fetch(`${apiBase}/brands?featured=true`, { next: { revalidate: 60 } }),
      fetch(`${apiBase}/categories?featured=true`, {
        next: { revalidate: 60 },
      }),
      fetch(`${apiBase}/products?featured=true&limit=4`, {
        next: { revalidate: 60 },
      }),
    ]);

    if (!brandsRes.ok || !categoriesRes.ok || !productsRes.ok) {
      return FALLBACK_SEED_DATA;
    }

    const [brands, categories, featuredProducts] = await Promise.all([
      brandsRes.json(),
      categoriesRes.json(),
      productsRes.json(),
    ]);

    return {
      brands: brands.data ?? FALLBACK_SEED_DATA.brands,
      categories: categories.data ?? FALLBACK_SEED_DATA.categories,
      featuredProducts:
        featuredProducts.data ?? FALLBACK_SEED_DATA.featuredProducts,
    };
  } catch {
    return FALLBACK_SEED_DATA;
  }
}
