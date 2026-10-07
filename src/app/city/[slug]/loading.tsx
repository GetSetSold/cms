import { SkeletonGrid, SkeletonBlock } from "@/components/site/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
      <div className="mb-6 h-10 w-72 rounded-md bg-[#ececee]" aria-hidden />
      <SkeletonGrid count={12} />
      <SkeletonBlock className="mt-12" />
    </div>
  );
}
