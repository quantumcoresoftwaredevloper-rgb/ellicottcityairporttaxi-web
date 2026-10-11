import { fileURLToPath } from "url";
import { resolve } from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import rideRoutes from "./routes/rides.js";
import driverRoutes from "./routes/drivers.js";
import adminRoutes from "./routes/admin.js";
import crmRoutes from "./routes/crm.js";
import placeRoutes from "./routes/places.js";
import userRoutes from "./routes/users.js";
import paymentRoutes from "./routes/payments.js";
import notificationRoutes from "./routes/notifications.js";
import settingsRoutes from "./routes/settings.js";
import contentRoutes from "./routes/content.js";
import catalogRoutes from "./routes/catalog.js";
import { ensureCatalogDefaults } from "./services/catalogService.js";
import { initRedis, redisRateLimitStore } from "./config/redis.js";
import { assertEnv, corsOrigins } from "./config/env.js";

dotenv.config();

// Refuse to boot a production process with placeholder secrets or dev tokens on.
assertEnv();

// Connect Redis before the limiters are built so they can share the store.
await initRedis();

// Defence in depth: a stray rejection in a socket handler or background job must
// not take the whole API down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

const app = express();

// Behind a reverse proxy (nginx, Render, Vercel) set TRUST_PROXY=true so
// req.ip / rate-limit see the real client address.
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);

app.use(helmet());

// The web deploy plus the native (Capacitor) app share this API, so CORS is an
// allowlist rather than one fixed origin. Returning `false` (instead of an
// error) omits the CORS headers, which makes the browser block the call without
// turning a blocked cross-origin read into a 500.
const allowedOrigins = corsOrigins();
const corsOriginCheck = (origin, cb) => {
  if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
  console.warn(`CORS blocked origin: ${origin}`);
  return cb(null, false);
};

app.use(
  cors({
    origin: corsOriginCheck,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

// Rate limiting — production hardening. Counters live in Redis when REDIS_URL
// is configured so the limits hold across multiple instances; otherwise they
// fall back to per-process memory.
const sharedStore = redisRateLimitStore();
if (sharedStore) console.log("Rate limits: shared (Redis)");

const limiter = ({ windowMs, max, message, name }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    ...(sharedStore ? { store: sharedStore } : {}),
    // ipKeyGenerator normalises IPv6 to a /64 subnet — keying on the raw
    // address would let a client rotate through its address space for free.
    ...(name ? { keyGenerator: (req) => `${name}:${ipKeyGenerator(req.ip ?? "")}` } : {}),
  });

const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API || 600),
  message: "Too many requests. Please try again later.",
  name: "api",
});
const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH || 60),
  message: "Too many attempts. Please try again later.",
  name: "auth",
});
const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: Number(
    process.env.RATE_LIMIT_LOGIN ||
      (process.env.NODE_ENV === "production" ? 10 : 100),
  ),
  message: "Too many login attempts. Please wait a few minutes.",
  name: "login",
});
const otpLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_OTP || 5),
  message: "Too many SMS requests. Please wait a few minutes.",
  name: "otp",
});

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/otp/send", otpLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/content", contentRoutes);
app.use("/api", catalogRoutes);

app.use(notFound);
app.use(errorHandler);

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: corsOriginCheck },
});

app.set("io", io);
initSocket(io);

const PORT = process.env.PORT || 5001;

export { app, server, start };

/**
 * Connect, seed the catalog, and start listening.
 *
 * Only invoked when this file is the entrypoint. Tests import `app` directly
 * against their own in-memory Mongo, so importing this module must NOT bind a
 * port or open a second database connection — which is why the boot sits behind
 * the `isDirectRun` check rather than running on import.
 */
async function start() {
  await connectDB();
  // Fleet classes + service offerings are admin-managed; seed once into an
  // empty collection so a fresh install is usable.
  await ensureCatalogDefaults().catch((e) => console.error('Catalog seed failed:', e.message));
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// `node src/index.js` behaves exactly as before; importing it does not boot.
const isDirectRun =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isDirectRun) start();

export default app;
