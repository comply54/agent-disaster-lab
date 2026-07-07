import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Vercel serverless: inline the comply54 package (zero-dep, no native binaries)
  serverExternalPackages: [],
  webpack(config, { isServer }) {
    if (!isServer) {
      // comply54 receipts.ts uses Buffer (Node built-in) in verifyReceipt().
      // Polyfill it for client components (e.g. CertificateViewer) so
      // offline receipt verification works in the browser.
      config.resolve.fallback = { ...config.resolve.fallback, buffer: require.resolve("buffer/") }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const wp = require("webpack")
      config.plugins.push(new wp.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }))
    }
    return config
  },
}

export default nextConfig
