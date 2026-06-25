import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  output: "standalone" as const,
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: "https" as const, hostname: "image.tmdb.org" },
    ],
  },
};

export default withSerwist(withNextIntl(nextConfig));
