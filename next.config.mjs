/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Allow MapLibre GL JS to bundle its web worker correctly
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  // Transpile maplibre-gl for Next.js compatibility
  transpilePackages: ['maplibre-gl'],
}

export default nextConfig
