/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingExcludes: {
      "*": ["backend/**/*"],
    },
  },
}

module.exports = nextConfig
