import Link from "next/link";

/** Frame 1, upper half: the welcome banner and the two account actions. */
export function Hero() {
  return (
    <section className="px-6 pt-16 pb-10 text-center sm:pt-24">
      <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl">
        Welcome to Podtracker!
      </h1>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/signup"
          className="min-w-56 rounded-full bg-accent px-8 py-3 font-serif text-lg text-white transition-colors hover:bg-accent/85"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="min-w-56 rounded-full bg-white px-8 py-3 font-serif text-lg transition-colors hover:bg-white/80"
        >
          Login
        </Link>
      </div>
    </section>
  );
}
