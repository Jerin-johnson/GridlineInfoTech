import { getLandingPageData } from "@/lib/api/store-front.api";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ManifestoCollage } from "@/components/landing/ManifestoCollage";
import { BrandShowcase } from "@/components/landing/BrandShowcase";
import { Product3DStage } from "@/components/landing/Product3DStage";
import { PillarsPinned } from "@/components/landing/PillarsPinned";
import { CategorySplitShowcase } from "@/components/landing/CategorySplitShowcase";
import { CinematicInterlude } from "@/components/landing/CinematicInterlude";
import { FeaturedCatalogue } from "@/components/landing/FeaturedCatalogue";
import { CinematicFooter } from "@/components/landing/CinematicFooter";

export default async function HomePage() {
  const { brands, categories, featuredProducts } = await getLandingPageData();

  return (
    <main className="relative bg-[#080808] text-[#F5F5F3]">
      <Navbar />
      <HeroSection />
      <ManifestoCollage />
      <BrandShowcase brands={brands} />
      <Product3DStage spotlight={featuredProducts[0]} />
      <PillarsPinned />
      <CategorySplitShowcase categories={categories} />
      <CinematicInterlude />
      <FeaturedCatalogue products={featuredProducts} />
      <CinematicFooter categories={categories} />
    </main>
  );
}
