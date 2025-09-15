import type { NextConfig } from "next";
import type { Configuration } from "webpack";
import dotenv from "dotenv";

dotenv.config();

const nextConfig: NextConfig = {
  transpilePackages: ["@bytebot/shared"],

  /**
   * Webpack configuration for Node.js module compatibility
   *
   * This configuration resolves Node.js-specific module imports that don't exist
   * in the browser environment. The NestJS framework includes many Node.js modules
   * that need to be mocked or fallback to empty modules for frontend builds.
   *
   * Key Node.js modules being handled:
   * - fs: File system module
   * - perf_hooks: Performance measurement hooks
   * - async_hooks: Asynchronous resource tracking
   * - path: File path utilities (using browser-compatible version)
   * - os: Operating system utilities
   * - util: Node.js utilities
   *
   * @param config - Webpack configuration object
   * @param param1 - Build context containing buildId, dev, isServer flags
   */
  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    // Only apply Node.js module fallbacks for client-side builds
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback as Record<string, unknown>),
        // File system - not available in browser
        fs: false,
        // Performance hooks - not available in browser
        perf_hooks: false,
        // Async hooks - not available in browser
        async_hooks: false,
        // Operating system utilities - not available in browser
        os: false,
        // Node.js utilities - provide empty module
        util: false,
        // Child process - not available in browser
        child_process: false,
        // Worker threads - not available in browser
        worker_threads: false,
        // Crypto module - use browser crypto API
        crypto: false,
        // Stream module - not needed for frontend
        stream: false,
        // Buffer module - use browser Buffer polyfill if needed
        buffer: false,
        // Events module - use browser-compatible version
        events: false,
        // Path module - use browser-compatible version
        path: require.resolve("path-browserify"),
        // Network module - not available in browser
        net: false,
        // TLS module - not available in browser
        tls: false,
        // REPL module - not available in browser
        repl: false,
        // HTTP2 module - required by gRPC, not available in browser
        http2: false,
        // DNS module - required by gRPC, not available in browser
        dns: false,
        // Inspector module - not available in browser
        inspector: false,
        // Diagnostics channel - not available in browser
        diagnostics_channel: false,
      };

      // Add externals configuration to ignore Node.js specific modules
      config.externals = config.externals ?? [];
      (config.externals as unknown[]).push({
        // Ignore optional NestJS modules that we've mocked
        "@nestjs/websockets": "commonjs @nestjs/websockets",
        "@nestjs/microservices": "commonjs @nestjs/microservices",
        "@nestjs/platform-express": "commonjs @nestjs/platform-express",
        // Ignore gRPC dependencies
        "@grpc/grpc-js": "commonjs @grpc/grpc-js",
        "@grpc/proto-loader": "commonjs @grpc/proto-loader",
        // Ignore microservices transport dependencies
        kafkajs: "commonjs kafkajs",
        mqtt: "commonjs mqtt",
        nats: "commonjs nats",
        amqplib: "commonjs amqplib",
        "amqp-connection-manager": "commonjs amqp-connection-manager",
        // Ignore canvas dependency (used by jsdom)
        canvas: "commonjs canvas",
        // Ignore Node.js built-in modules
        fs: "commonjs fs",
        perf_hooks: "commonjs perf_hooks",
        async_hooks: "commonjs async_hooks",
        os: "commonjs os",
        util: "commonjs util",
        child_process: "commonjs child_process",
        worker_threads: "commonjs worker_threads",
        net: "commonjs net",
        tls: "commonjs tls",
        repl: "commonjs repl",
        http2: "commonjs http2",
        dns: "commonjs dns",
        inspector: "commonjs inspector",
        diagnostics_channel: "commonjs diagnostics_channel",
      });
    }

    // Add aliases for problematic modules
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, unknown>),
      // Provide browser-compatible alternatives
      perf_hooks: false,
      async_hooks: false,
      fs: false,
    };

    return config;
  },

  /**
   * Build configuration optimizations
   */
  experimental: {
    // Enable webpack build worker for faster builds
    webpackBuildWorker: true,
  },
};

export default nextConfig;
