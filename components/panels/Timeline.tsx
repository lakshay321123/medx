"use client";
export default function Timeline({ threadId }: { threadId: string }) {
  return (
    <div className="p-4">
      <div className="opacity-70">No predictions yet (thread: {threadId}).</div>
    </div>
  );
}
