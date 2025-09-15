"use client";

import Logo from "@/components/brand/Logo";

export default function Brand() {
  return <Logo onClick={() => sessionStorage.removeItem("search_docked")} />;
}
