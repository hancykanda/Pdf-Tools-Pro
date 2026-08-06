import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["185.227.108.235"],
  // The custom credential auth pages were replaced by Clerk (`/sign-in`,
  // `/sign-up`). Keep the legacy paths working for any remaining links.
  async redirects() {
    return [
      { source: "/auth/signin", destination: "/sign-in", permanent: false },
      { source: "/auth/register", destination: "/sign-up", permanent: false },
      { source: "/auth/error", destination: "/sign-in", permanent: false },
    ];
  },
};

export default nextConfig;
