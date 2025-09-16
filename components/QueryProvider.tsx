"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

const FIVE_MINUTES = 5 * 60 * 1000;
const FORTY_FIVE_MINUTES = 45 * 60 * 1000;

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: FIVE_MINUTES,
            gcTime: FORTY_FIVE_MINUTES,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
            keepPreviousData: true,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
