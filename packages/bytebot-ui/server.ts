import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createProxyServer } from "http-proxy";
import next from "next";
import { createServer } from "http";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

// Import standardized security configuration for UI service
import { SecurityLevel, ServiceType } from "@bytebot/shared/server";

// Load environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "9992", 10);
const environment: string = process.env.NODE_ENV || "development";

// Backend URLs with defaults for development
const BYTEBOT_AGENT_BASE_URL =
  process.env.BYTEBOT_AGENT_BASE_URL || "http://localhost:9991";
const BYTEBOT_DESKTOP_VNC_URL =
  process.env.BYTEBOT_DESKTOP_VNC_URL || "http://localhost:9990";

// Security configuration
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:9990", // BytebotD
  "http://localhost:9991", // Bytebot Agent
  "http://localhost:9992", // Bytebot UI
  "https://app.bytebot.ai",
  "https://bytebot.ai",
  "https://localhost:3000",
  "https://localhost:3001",
  "https://localhost:9992",
];

const app = next({ dev, hostname, port });

app
  .prepare()
  .then(() => {
    const handle = app.getRequestHandler();
    const nextUpgradeHandler = app.getUpgradeHandler();

    const vncProxy = createProxyServer({ changeOrigin: true, ws: true });

    const expressApp = express();

    // Determine security level based on environment for standardized security
    const securityLevel =
      environment === "production"
        ? SecurityLevel._STANDARD
        : environment === "staging"
          ? SecurityLevel._STANDARD
          : SecurityLevel._MINIMAL;

    console.log(`Bytebot-UI standardized security configuration applied`, {
      serviceType: ServiceType._BYTEBOT_UI,
      environment,
      securityLevel,
      corsOrigins: ALLOWED_ORIGINS.length,
    });

    // Configure security headers with helmet
    expressApp.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'", // Required for Next.js
              "'unsafe-eval'", // Required for Next.js development
              "https://cdn.jsdelivr.net",
              "https://unpkg.com",
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'", // Required for Next.js
              "https://fonts.googleapis.com",
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
              "'self'",
              "ws:",
              "wss:",
              "http://localhost:*",
              "https://localhost:*",
              "https://app.bytebot.ai",
              "https://api.bytebot.ai",
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "blob:"],
            frameSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
          reportOnly: dev,
        },
        crossOriginEmbedderPolicy: false, // Required for WebSocket compatibility
        crossOriginOpenerPolicy: { policy: "same-origin" },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: "deny" },
        hidePoweredBy: true,
        hsts:
          environment === "production"
            ? {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true,
              }
            : false,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: "no-referrer" },
        xssFilter: true,
      }),
    );

    // Configure CORS with production-grade origin validation
    expressApp.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, curl, postman, etc.)
          if (!origin) {
            return callback(null, true);
          }

          // Check if origin is in allowed list
          if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
          }

          // Allow localhost with any port in development
          if (
            dev &&
            (origin.startsWith("http://localhost:") ||
              origin.startsWith("https://localhost:"))
          ) {
            return callback(null, true);
          }

          // Block unauthorized origins
          console.warn(`CORS blocked unauthorized origin: ${origin}`, {
            blockedOrigin: origin,
            allowedOrigins: ALLOWED_ORIGINS,
            timestamp: new Date().toISOString(),
          });

          return callback(
            new Error(`Origin ${origin} not allowed by CORS policy`),
            false,
          );
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
          "Cache-Control",
          "X-API-Key",
        ],
        exposedHeaders: [
          "X-Request-ID",
          "X-Response-Time",
          "X-Rate-Limit-Remaining",
        ],
        credentials: true,
        maxAge: 86400, // 24 hours preflight cache
        preflightContinue: false,
        optionsSuccessStatus: 204,
      }),
    );

    // Security headers for custom responses
    expressApp.use((req, res, next) => {
      res.setHeader("X-Service", "Bytebot-UI");
      res.setHeader("X-API-Version", "1.0");

      if (environment === "production") {
        res.removeHeader("X-Powered-By");
        res.removeHeader("Server");
      }

      next();
    });

    const server = createServer(expressApp);

    // WebSocket proxy for Socket.IO connections to backend
    const tasksProxy = createProxyMiddleware({
      target: BYTEBOT_AGENT_BASE_URL,
      ws: true,
      pathRewrite: { "^/api/proxy/tasks": "/socket.io" },
    });

    // Apply HTTP proxies
    expressApp.use("/api/proxy/tasks", tasksProxy);
    expressApp.use("/api/proxy/websockify", (req, res) => {
      console.log("Proxying websockify request");
      // Rewrite path
      const targetUrl = new URL(BYTEBOT_DESKTOP_VNC_URL!);
      req.url =
        targetUrl.pathname +
        (req.url?.replace(/^\/api\/proxy\/websockify/, "") || "");
      vncProxy.web(req, res, {
        target: `${targetUrl.protocol}//${targetUrl.host}`,
      });
    });

    // Handle all other requests with Next.js
    expressApp.all("*", (req, res) => handle(req, res));

    // Properly upgrade WebSocket connections
    server.on("upgrade", (request, socket, head) => {
      const { pathname } = new URL(
        request.url!,
        `http://${request.headers.host}`,
      );

      if (pathname.startsWith("/api/proxy/tasks")) {
        return tasksProxy.upgrade(request, socket as any, head);
      }

      if (pathname.startsWith("/api/proxy/websockify")) {
        const targetUrl = new URL(BYTEBOT_DESKTOP_VNC_URL!);
        request.url =
          targetUrl.pathname +
          (request.url?.replace(/^\/api\/proxy\/websockify/, "") || "");
        console.log("Proxying websockify upgrade request: ", request.url);
        return vncProxy.ws(request, socket as any, head, {
          target: `${targetUrl.protocol}//${targetUrl.host}`,
        });
      }

      nextUpgradeHandler(request, socket, head);
    });

    server.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });
