'use client';
export default function InlineSponsoredSkeleton() {
  return (
    <div className="mt-3">
      <div className="min-h-[84px] pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="inline-block h-5 w-40 rounded-full bg-zinc-200/70 dark:bg-zinc-700/50" />
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-52 rounded bg-zinc-200/80 dark:bg-zinc-700/60" />
            <div className="h-3 w-40 rounded bg-zinc-200/60 dark:bg-zinc-700/40" />
          </div>
          <div className="h-7 w-24 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/50" />
        </div>
      </div>
    </div>
  );
}
