"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function NavLink({
  panel,
  children,
  className,
}: {
  panel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const params = useSearchParams();
  const threadId = params.get("threadId") ?? "";

  const qs = new URLSearchParams();
  qs.set("panel", panel);
  if (threadId) qs.set("threadId", threadId);

  return (
    <Link
      href={"?" + qs.toString()}
      prefetch={false}
      className={className ?? "block w-full text-left rounded-md px-3 py-2 hover:bg-muted"}
      data-testid={`nav-${panel}`}
    >
      {children}
    </Link>
  );
}
