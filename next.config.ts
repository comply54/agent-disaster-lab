import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Vercel serverless: inline the comply54 package (zero-dep, no native binaries)
  serverExternalPackages: [],
}

export default nextConfig
