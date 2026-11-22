import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo en desarrollo: permite abrir `next dev` desde el celular por la IP de la red local.
  // Sin esto Next bloquea (403) los recursos /_next/* pedidos con Origin de otra IP, entre ellos
  // el código de la escena 3D, y la camiseta no aparece.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
