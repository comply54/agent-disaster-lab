import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Vercel serverless: inline the comply54 package (zero-dep, no native binaries)
  serverExternalPackages: [],
  turbopack: {
    resolveAlias: {
      buffer: "buffer/",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve("buffer/"),
        crypto: false,
      }
    }
    return config
  },
}

export default nextConfig
