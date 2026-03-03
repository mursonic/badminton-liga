// OAuth routes replaced by custom password auth in routers.ts
// This file is kept as a no-op to avoid import errors in index.ts
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // No-op: authentication is handled via tRPC procedures (auth.login / auth.logout)
}
