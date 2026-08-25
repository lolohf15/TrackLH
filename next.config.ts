import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
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
