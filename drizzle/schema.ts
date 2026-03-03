import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Admin Users ──────────────────────────────────────────────────────────────
// DB columns: id, username, password_hash, created_at

export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// ─── Players ──────────────────────────────────────────────────────────────────
// DB columns: id, name, nickname, gender, active, createdAt, updatedAt, created_at

export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  active: boolean("active").notNull().default(true),
  gender: mysqlEnum("gender", ["male", "female", "other"]).notNull().default("other"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ─── Seasons ──────────────────────────────────────────────────────────────────
// DB columns: id, year, name, isActive, createdAt, is_active, created_at

export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

// ─── Matches ──────────────────────────────────────────────────────────────────
// DB columns: id, seasonId, ...(old cols)..., type, player1_id, player2_id,
//             player3_id, player4_id, winning_side, played_at, new_created_at

export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  type: mysqlEnum("type", ["singles", "doubles", "mixed"]).notNull(),
  player1Id: int("player1_id").notNull(),
  player2Id: int("player2_id"),
  player3Id: int("player3_id").notNull(),
  player4Id: int("player4_id"),
  winningSide: int("winning_side").notNull(),
  playedAt: bigint("played_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  createdAt: bigint("new_created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ─── Match Sets ───────────────────────────────────────────────────────────────
// DB columns: id, matchId, setNumber, team1Score, team2Score, score_team1, score_team2

export const matchSets = mysqlTable("match_sets", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  setNumber: int("setNumber").notNull(),
  scoreTeam1: int("score_team1").notNull(),
  scoreTeam2: int("score_team2").notNull(),
});

export type MatchSet = typeof matchSets.$inferSelect;
export type InsertMatchSet = typeof matchSets.$inferInsert;

// Legacy users table (required by Manus auth core – do not remove)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
