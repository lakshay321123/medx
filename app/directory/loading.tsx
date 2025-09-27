export default function DirectoryLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 bg-slate-50/60 p-6">
      <div className="h-10 w-48 animate-pulse rounded-full bg-slate-200" />
      <div className="h-12 animate-pulse rounded-3xl bg-slate-200" />
      <div className="space-y-3">
        {[1, 2, 3].map(item => (
          <div key={item} className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white/60" />
        ))}
      </div>
    </div>
  );
}
