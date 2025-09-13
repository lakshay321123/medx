"use client";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="w-64 p-3">
      {/* Core nav */}
      <button onClick={()=>router.push("/?panel=chat")}
        className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">Chat</button>
      <button onClick={()=>router.push("/?panel=chat&threadId=med-profile&context=profile")}
        className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">AI Doc</button>
      <button onClick={()=>router.push("/?panel=profile")}
        className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">Medical Profile</button>
      <button onClick={()=>router.push("/?panel=timeline")}
        className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">Timeline</button>
      <button onClick={()=>router.push("/?panel=alerts")}
        className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">Alerts</button>
      <button onClick={()=>router.push("/?panel=settings")}
        className="mb-1 w-full rounded-lg border px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">Settings</button>
    </aside>
  );
}
