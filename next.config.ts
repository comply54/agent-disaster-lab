import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Vercel serverless: inline the comply54 package (zero-dep, no native binaries)
  serverExternalPackages: [],
  turbopack: {
    // comply54 receipts.ts uses Buffer (Node built-in) in verifyReceipt().
    // Polyfill it for client components (e.g. CertificateViewer) so
    // offline receipt verification works in the browser.
    resolveAlias: {
      buffer: "buffer/",
    },
  },
}

export default nextConfig
