/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // ── MapLibre GL JS v5.x — worker served from /public/ ─────────────────
    // We host /public/maplibre-gl-csp-worker.js (copied by postinstall).
    // MapLibreSatellite.tsx sets maplibregl.workerUrl = '/maplibre-gl-csp-worker.js'
    // before creating any Map instance, replacing the default inline blob worker.
    // No transpilePackages or asyncWebAssembly needed for this approach.
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        // NOTE: layers:true was removed — it can interfere with blob Worker
        // creation on some webpack versions and is not needed for raster tiles.
      };
    }

    // Suppress the "Critical dependency: the request of a dependency is an
    // expression" warning from maplibre-gl's dynamic worker import.
    config.module = config.module ?? {};
    config.module.exprContextCritical = false;

    return config;
  },
  // ── IMPORTANT: do NOT add 'maplibre-gl' to transpilePackages ────────────
  // It is a pure-ESM package (type:module). Next.js 14 handles it natively.
  // Transpiling it corrupts the worker bundle resolution.
};

export default nextConfig;
