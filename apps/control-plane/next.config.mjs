/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Read on-chain via viem + public-decrypt confidence via the Nox handle SDK in
  // server route handlers; keep these external so Next doesn't bundle them.
  serverExternalPackages: ["viem", "@iexec-nox/handle"],
};

export default nextConfig;
