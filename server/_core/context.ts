import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "@shared/const";

export type AdminUser = {
  id: number;
  username: string;
  role: "admin";
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AdminUser | null;
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "atsv-badminton-liga-secret-change-me"
);

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AdminUser | null = null;

  try {
    const cookies = parseCookies(opts.req.headers.cookie || "");
    const token = cookies[COOKIE_NAME];
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.id && payload.username) {
        user = {
          id: payload.id as number,
          username: payload.username as string,
          role: "admin",
        };
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
