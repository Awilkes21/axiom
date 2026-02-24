import express from "express";
import cors from "cors";
import pool from "./db.js";
import systemRoutes from "./routes/system.routes.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = express();

app.locals.pool = pool;
app.locals.jwtSecret = DEFAULT_JWT_SECRET;

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.use(systemRoutes);
app.use(authRoutes);
app.use(profileRoutes);

export default app;
