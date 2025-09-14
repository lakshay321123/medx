import { ReactNode } from "react";

export const Renderer = {
  h1: ({ children }: { children: ReactNode }) => (
    <h1 className="text-lg font-semibold">{children}</h1>
  ),
  h2: ({ children }: { children: ReactNode }) => (
    <h2 className="text-base font-semibold mt-4">{children}</h2>
  ),
  ol: ({ children }: { children: ReactNode }) => (
    <ol className="list-decimal ml-5 space-y-1">{children}</ol>
  ),
  ul: ({ children }: { children: ReactNode }) => (
    <ul className="list-disc ml-4 space-y-1">{children}</ul>
  ),
  table: ({ children }: { children: ReactNode }) => (
    <table className="table-auto border-collapse my-3">{children}</table>
  ),
  thead: ({ children }: { children: ReactNode }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }: { children: ReactNode }) => <th className="px-2 py-1 font-semibold text-left border">{children}</th>,
  td: ({ children }: { children: ReactNode }) => <td className="px-2 py-1 align-top border">{children}</td>,
};
