/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ]
  },
  experimental: {
    outputFileTracingExcludes: {
      "*": ["backend/**/*"],
    },
  },
}

module.exports = nextConfig
