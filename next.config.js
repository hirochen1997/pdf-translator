/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false

    if (isServer) {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push("pdfjs-dist")
      }
    }

    return config
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
}

module.exports = nextConfig
