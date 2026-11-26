export function CatalogueSkeleton() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F3]">
      <div className="pt-28 pb-10 border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 space-y-3">
          <div className="h-3 w-44 bg-[#141417] animate-pulse" />
          <div className="h-12 w-80 max-w-full bg-[#141417] animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-[#141417] animate-pulse" />
        </div>
      </div>

      <div className="border-b border-white/10 h-12 bg-[#080808]" />

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            <div className="h-6 w-32 bg-[#141417] animate-pulse" />
            <div className="h-48 w-full bg-[#0D0D0F] border border-white/10 animate-pulse" />
          </div>

          <div className="lg:col-span-9 space-y-8">
            <div className="h-10 w-full bg-[#141417] animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border border-white/10 bg-[#0D0D0F] flex flex-col"
                >
                  <div className="aspect-[4/3] w-full bg-[#141417] animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-28 bg-[#141417] animate-pulse" />
                    <div className="h-6 w-3/4 bg-[#141417] animate-pulse" />
                    <div className="h-4 w-1/2 bg-[#141417] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
