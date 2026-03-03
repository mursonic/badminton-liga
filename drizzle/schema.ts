import { int, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Admin Users ──────────────────────────────────────────────────────────────
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// ─── Players ──────────────────────────────────────────────────────────────────
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ─── Seasons ──────────────────────────────────────────────────────────────────
export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull().unique(),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

// ─── Matches ──────────────────────────────────────────────────────────────────
export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  type: text("type", { enum: ["singles", "doubles", "mixed"] }).notNull(),
  // Singles: player1Id vs player2Id
  // Doubles/Mixed: player1Id+player2Id vs player3Id+player4Id
  player1Id: integer("player1_id").notNull().references(() => players.id),
  player2Id: integer("player2_id").references(() => players.id),
  player3Id: integer("player3_id").notNull().references(() => players.id),
  player4Id: integer("player4_id").references(() => players.id),
  // 1 = team1 (player1+2) won, 2 = team2 (player3+4) won
  winningSide: integer("winning_side", { mode: "number" }).notNull(),
  playedAt: integer("played_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ─── Match Sets ───────────────────────────────────────────────────────────────
export const matchSets = sqliteTable("match_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull().references(() => matches.id),
  setNumber: integer("set_number").notNull(),
  scoreTeam1: integer("score_team1").notNull(),
  scoreTeam2: integer("score_team2").notNull(),
});

export type MatchSet = typeof matchSets.$inferSelect;
export type InsertMatchSet = typeof matchSets.$inferInsert;
