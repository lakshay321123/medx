import { ReactNode } from "react";

export const Renderer = {
  h1: ({ children }: { children: ReactNode }) => (
    <h1 className="text-lg font-semibold">{children}</h1>
  ),
  ul: ({ children }: { children: ReactNode }) => (
    <ul className="list-disc ml-4 space-y-1">{children}</ul>
  ),
};
