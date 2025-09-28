import createMDX from "@next/mdx";

const withMDX = createMDX({});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "mdx"],
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
};

export default withMDX(nextConfig);
