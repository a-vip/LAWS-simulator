/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // ── MapLibre GL JS v5.x compatibility ─────────────────────────────────
    // v5 ships as pure ESM and uses a Web Worker for tile decoding.
    // Do NOT add maplibre-gl to transpilePackages — webpack transpiling it
    // breaks the worker URL, causing a black map with no tiles.
    // asyncWebAssembly is required for the protomaps/pmtiles dependency used
    // internally by maplibre-gl v5.
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
      };
    }

    // Silence the "Critical dependency: the request of a dependency is an
    // expression" warning that comes from maplibre-gl's dynamic worker import.
    config.module = config.module ?? {};
    config.module.exprContextCritical = false;

    return config;
  },
  // ── IMPORTANT: do NOT add 'maplibre-gl' to transpilePackages ────────────
  // It is a pure-ESM package and Next.js 14 handles it natively.
  // Transpiling it corrupts the internal worker bundle.
};

export default nextConfig;
