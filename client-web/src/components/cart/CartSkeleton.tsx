export function CartSkeleton() {
  return (
    <main className="max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 pt-32 pb-20 space-y-10">
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="h-3 w-32 bg-[#141417]" />
        <div className="h-10 w-56 bg-[#141417]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="border border-white/10 bg-[#0D0D0F] p-6 flex flex-col sm:flex-row gap-6"
            >
              <div className="w-28 aspect-[4/3] bg-[#141417] shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-2/3 bg-[#141417]" />
                <div className="h-3 w-28 bg-[#141417]" />
                <div className="h-10 w-36 bg-[#141417] pt-2" />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 border border-white/10 bg-[#0D0D0F] p-6 sm:p-8 space-y-5">
          <div className="h-6 w-40 bg-[#141417]" />
          <div className="space-y-3 pt-2">
            <div className="h-4 w-full bg-[#141417]" />
            <div className="h-4 w-full bg-[#141417]" />
            <div className="h-4 w-full bg-[#141417]" />
          </div>
          <div className="h-12 w-full bg-[#141417]" />
        </div>
      </div>
    </main>
  );
}
