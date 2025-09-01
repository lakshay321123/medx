// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.appDir (not valid in Next 14+)
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ canvas: 'commonjs canvas' });
    config.externals.push({ 'pdfjs-dist/legacy/build/pdf.js': 'commonjs pdfjs-dist/legacy/build/pdf.js' });
    return config;
  },
};

export default nextConfig;
