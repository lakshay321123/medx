import Link from "next/link";

export default function Brand() {
  return (
    <Link href="/" aria-label="MedX Home"
      onClick={()=>{
        // Optional: reset transient UI session state:
        sessionStorage.removeItem("search_docked");
      }}
      className="inline-flex items-center gap-2">
      <img src="/medx-logo.svg" alt="MedX" className="h-6 w-auto" />
    </Link>
  );
}
