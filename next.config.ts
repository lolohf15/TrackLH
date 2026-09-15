import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},

  // The tabs were renamed in the redesign. Kept non-permanent on purpose:
  // a 308 gets cached hard by browsers, and these paths are still in flux.
  async redirects() {
    return [
      { source: "/cuentas", destination: "/wallet", permanent: false },
      { source: "/movimientos", destination: "/wallet", permanent: false },
      { source: "/categorias", destination: "/analytics", permanent: false },
      { source: "/categorias/:category", destination: "/analytics/:category", permanent: false },
    ];
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    // API responses belong to whoever was signed in when they were fetched,
    // and the worker has no idea who that was. On a shared phone a cached
    // response would be served to the next account, so none are stored.
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/[^/]+\/api\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
})(nextConfig);
