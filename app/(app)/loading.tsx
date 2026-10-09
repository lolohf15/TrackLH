import { ChartSkeleton } from "@/components/ui/Skeleton";

/**
 * The (app) layout checks the session, so every tab is a dynamic route and a
 * tap used to wait on the server before anything moved. With a loading state
 * Next prefetches this shell, the switch starts the moment the tab is tapped,
 * and the page swaps in once the server answers.
 */
export default function Loading() {
  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 pt-4 flex flex-col gap-4" aria-busy="true">
      <ChartSkeleton height="h-10" />
      <ChartSkeleton height="h-40" />
      <ChartSkeleton height="h-56" />
    </div>
  );
}
