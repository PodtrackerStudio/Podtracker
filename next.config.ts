import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Discord bot draws its analytics image with Geist, read from disk at
  // runtime. A path built from process.cwd() isn't traced automatically, so
  // without this the fonts would be missing from the deployed function.
  outputFileTracingIncludes: {
    "/api/discord": ["./src/lib/discord/fonts/*.ttf"],
  },

  // Security headers on every response. Vercel adds HSTS by itself; until
  // 2026-11-06 nothing else was sent.
  //   - Framing is refused, which stops clickjacking. The site never iframes
  //     itself.
  //   - nosniff stops browsers treating a response as a type it wasn't
  //     served as.
  //   - Other sites are told where a visitor came from, but not the full URL.
  //   - Camera, microphone and location are off; nothing uses them.
  // There is no full Content-Security-Policy: Next's inline scripts, Vercel
  // Analytics and Stripe would each need allowing, and one that is wrong
  // breaks pages silently. It is worth doing as its own piece of work.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
