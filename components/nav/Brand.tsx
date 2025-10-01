// components/nav/Brand.tsx
import Logo from "@/components/brand/Logo";

export default function Brand() {
  return (
    <Logo className="dark:text-white dark:[&_img]:brightness-0 dark:[&_img]:invert" />
  );
}
