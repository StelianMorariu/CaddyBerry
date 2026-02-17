import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  env: {
    APP_VERSION: process.env.APP_VERSION || require("./package.json").version,
  },
};

export default nextConfig;
