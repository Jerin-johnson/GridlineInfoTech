export function ProductDetailSkeleton() {
  return (
    <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-28 pb-20 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Media Skeleton */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full border border-[#222228] bg-[#0D0D0F] animate-pulse motion-reduce:animate-none" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] border border-[#222228] bg-[#0D0D0F]"
              />
            ))}
          </div>
        </div>

        {/* Right: Purchase Panel Skeleton */}
        <div className="lg:col-span-5 border border-[#222228] bg-[#0D0D0F] p-6 sm:p-8 space-y-6">
          <div className="h-3 w-48 bg-[#141417]" />
          <div className="h-9 w-3/4 bg-[#141417]" />
          <div className="h-7 w-32 bg-[#141417]" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-[#141417]" />
            <div className="h-3 w-5/6 bg-[#141417]" />
          </div>
          <div className="h-12 w-full bg-[#141417]" />
        </div>
      </div>
    </main>
  );
}
