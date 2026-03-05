import { int, mysqlEnum, mysqlTable, text, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

// ─── Admin Users ─────────────────────────────────────────────────────────────
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// ─── Players ─────────────────────────────────────────────────────────────────
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other"]).default("other").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ─── Seasons ─────────────────────────────────────────────────────────────────
export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

// ─── Matches ─────────────────────────────────────────────────────────────────
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("season_id").notNull(),
  type: mysqlEnum("type", ["singles", "doubles", "mixed"]).notNull(),
  player1Id: int("player1_id").notNull(),
  player2Id: int("player2_id"),
  player3Id: int("player3_id").notNull(),
  player4Id: int("player4_id"),
  winningSide: int("winning_side").notNull(),
  playedAt: bigint("played_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ─── Match Sets ───────────────────────────────────────────────────────────────
export const matchSets = mysqlTable("match_sets", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("match_id").notNull(),
  setNumber: int("set_number").notNull(),
  scoreTeam1: int("score_team1").notNull(),
  scoreTeam2: int("score_team2").notNull(),
});

export type MatchSet = typeof matchSets.$inferSelect;
export type InsertMatchSet = typeof matchSets.$inferInsert;
