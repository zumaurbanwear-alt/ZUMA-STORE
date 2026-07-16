import { Skeleton } from "@/components/zuma/common/Skeleton";

// Mirrors Product.tsx's real layout section by section — image + thumbnail
// strip on one side, title/price/description/size/color/CTA stack on the
// other — so switching from this to the real page never shifts anything.
export const ProductDetailSkeleton = () => (
  <div style={{ paddingTop: "120px", paddingBottom: "80px" }} className="px-6 md:px-10 flex-1">
    <div className="max-w-[1200px] mx-auto">
      <Skeleton className="h-3 w-16 mb-8" />

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-stretch">
        <div className="relative md:h-full">
          <Skeleton className="w-full aspect-[4/5] md:aspect-auto md:h-full border border-border" />
          <div className="relative md:absolute left-0 right-0 md:top-full mt-3 flex gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-16 border border-border" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>

          <div className="flex flex-col gap-2 max-w-md">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-border pt-4 max-w-md">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-2.5 w-16" />
            ))}
          </div>

          <div>
            <Skeleton className="h-2.5 w-20 mb-2" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-12" />
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="h-2.5 w-24 mb-2" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16" />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
