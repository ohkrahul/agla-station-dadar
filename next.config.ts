import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits exactly where the player bezel does, which
  // makes screenshot review of that corner useless.
  devIndicators: false,
};

export default nextConfig;
