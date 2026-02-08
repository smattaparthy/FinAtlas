/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@finatlas/engine", "@finatlas/schemas"],
  experimental: {
    serverComponentsExternalPackages: ["argon2", "@react-pdf/renderer"],
  },
};

export default nextConfig;
