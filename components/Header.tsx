import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header
      className="
        sticky top-0 z-40 w-full border-b
        bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60
        text-gray-900
        dark:bg-gray-900/80 dark:supports-[backdrop-filter]:bg-gray-900/60
        dark:text-gray-100 dark:border-gray-800
      "
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="font-semibold tracking-tight">
          MedX
        </div>

        <nav className="flex items-center gap-4">
          <a
            href="#"
            className="text-sm text-gray-600 hover:text-gray-900
                       dark:text-gray-300 dark:hover:text-white"
          >
            Docs
          </a>
          <a
            href="#"
            className="text-sm text-gray-600 hover:text-gray-900
                       dark:text-gray-300 dark:hover:text-white"
          >
            Support
          </a>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
