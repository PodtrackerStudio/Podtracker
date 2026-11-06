import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Discord bot draws its analytics image with Geist, read from disk at
  // runtime. A path built from process.cwd() isn't traced automatically, so
  // without this the fonts would be missing from the deployed function.
  outputFileTracingIncludes: {
    "/api/discord": ["./src/lib/discord/fonts/*.ttf"],
  },
};

export default nextConfig;
