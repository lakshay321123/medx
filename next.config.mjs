// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.appDir (not valid in Next 14+)
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
