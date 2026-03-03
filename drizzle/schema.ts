import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
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

/**
 * Spieler (Vereinsmitglieder)
 */
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nickname: varchar("nickname", { length: 64 }),
  gender: mysqlEnum("gender", ["male", "female", "other"]).default("other").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

/**
 * Saisons (nach Jahr)
 */
export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

/**
 * Spiele (Einzel, Doppel, Mixed)
 * - Einzel: player1Id vs player2Id, team1Player2Id und team2Player2Id sind null
 * - Doppel/Mixed: alle vier Felder belegt
 */
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  matchType: mysqlEnum("matchType", ["singles", "doubles", "mixed"]).notNull(),
  /** Team 1 Spieler 1 */
  team1Player1Id: int("team1Player1Id").notNull(),
  /** Team 1 Spieler 2 (nur Doppel/Mixed) */
  team1Player2Id: int("team1Player2Id"),
  /** Team 2 Spieler 1 */
  team2Player1Id: int("team2Player1Id").notNull(),
  /** Team 2 Spieler 2 (nur Doppel/Mixed) */
  team2Player2Id: int("team2Player2Id"),
  /** Gewinner: 1 = Team 1, 2 = Team 2 */
  winner: mysqlEnum("winner", ["team1", "team2"]).notNull(),
  /** Gesamtpunkte Team 1 über alle Sätze */
  team1TotalPoints: int("team1TotalPoints").notNull().default(0),
  /** Gesamtpunkte Team 2 über alle Sätze */
  team2TotalPoints: int("team2TotalPoints").notNull().default(0),
  /** Gewonnene Sätze Team 1 */
  team1Sets: int("team1Sets").notNull().default(0),
  /** Gewonnene Sätze Team 2 */
  team2Sets: int("team2Sets").notNull().default(0),
  playedAt: timestamp("playedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * Einzelne Sätze eines Spiels
 */
export const matchSets = mysqlTable("match_sets", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  setNumber: int("setNumber").notNull(),
  team1Score: int("team1Score").notNull(),
  team2Score: int("team2Score").notNull(),
});

export type MatchSet = typeof matchSets.$inferSelect;
export type InsertMatchSet = typeof matchSets.$inferInsert;
