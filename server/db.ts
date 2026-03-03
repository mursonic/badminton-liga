import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import {
  adminUsers,
  InsertAdminUser,
  InsertMatch,
  InsertMatchSet,
  InsertPlayer,
  InsertSeason,
  matchSets,
  matches,
  players,
  seasons,
} from "../drizzle/schema";

// ─── DB Connection ────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "liga.db");
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const client = createClient({ url: `file:${dbPath}` });
    _db = drizzle(client);
    // Run migrations on startup
    initDb(_db);
  }
  return _db;
}

function initDb(db: ReturnType<typeof drizzle>) {
  // Create tables if not exist (simple approach for standalone deployment)
  const client = (db as any).$client as ReturnType<typeof createClient>;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      gender TEXT NOT NULL DEFAULT 'other',
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )`,
    // Migration: add gender column if it doesn't exist yet
    `ALTER TABLE players ADD COLUMN gender TEXT NOT NULL DEFAULT 'other'`,
    `CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL REFERENCES seasons(id),
      type TEXT NOT NULL CHECK(type IN ('singles','doubles','mixed')),
      player1_id INTEGER NOT NULL REFERENCES players(id),
      player2_id INTEGER REFERENCES players(id),
      player3_id INTEGER NOT NULL REFERENCES players(id),
      player4_id INTEGER REFERENCES players(id),
      winning_side INTEGER NOT NULL,
      played_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS match_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id),
      set_number INTEGER NOT NULL,
      score_team1 INTEGER NOT NULL,
      score_team2 INTEGER NOT NULL
    )`,
  ];
  // Execute synchronously via batch
  // Run all statements; ignore errors for ALTER TABLE (column may already exist)
  Promise.all(stmts.map(s => client.execute(s).catch(() => {}))).catch(e => console.error("[DB init]", e));
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export async function getAdminByUsername(username: string) {
  const db = getDb();
  const result = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  return result[0] ?? null;
}

export async function createAdminUser(data: Omit<InsertAdminUser, "id" | "createdAt">) {
  const db = getDb();
  await db.insert(adminUsers).values(data);
}

export async function updateAdminPassword(id: number, newHash: string) {
  const db = getDb();
  await db.update(adminUsers).set({ passwordHash: newHash }).where(eq(adminUsers.id, id));
}

export async function countAdminUsers(): Promise<number> {
  const db = getDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(adminUsers);
  return Number(result[0]?.count ?? 0);
}

// ─── Players ─────────────────────────────────────────────────────────────────

export async function getAllPlayers() {
  const db = getDb();
  return db.select().from(players).orderBy(players.name);
}

export async function getActivePlayers() {
  const db = getDb();
  return db.select().from(players).where(eq(players.active, true)).orderBy(players.name);
}

export async function createPlayer(data: Omit<InsertPlayer, "id" | "createdAt">) {
  const db = getDb();
  await db.insert(players).values(data);
}

export async function updatePlayer(id: number, data: Partial<Omit<InsertPlayer, "id" | "createdAt">>) {
  const db = getDb();
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function deletePlayer(id: number) {
  const db = getDb();
  await db.delete(players).where(eq(players.id, id));
}

// ─── Seasons ─────────────────────────────────────────────────────────────────

export async function getAllSeasons() {
  const db = getDb();
  return db.select().from(seasons).orderBy(desc(seasons.year));
}

export async function getActiveSeason() {
  const db = getDb();
  const result = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
  return result[0] ?? null;
}

export async function createSeason(data: Omit<InsertSeason, "id" | "createdAt">) {
  const db = getDb();
  await db.update(seasons).set({ isActive: false });
  await db.insert(seasons).values({ ...data, isActive: true });
}

export async function setActiveSeason(id: number) {
  const db = getDb();
  await db.update(seasons).set({ isActive: false });
  await db.update(seasons).set({ isActive: true }).where(eq(seasons.id, id));
}

export async function updateSeason(id: number, data: { name?: string; year?: number }) {
  const db = getDb();
  await db.update(seasons).set(data).where(eq(seasons.id, id));
}

export async function deleteSeason(id: number) {
  const db = getDb();
  const matchCount = await db.select().from(matches).where(eq(matches.seasonId, id));
  if (matchCount.length > 0) {
    throw new Error(`Diese Saison enthält ${matchCount.length} Spiel(e) und kann nicht gelöscht werden.`);
  }
  await db.delete(seasons).where(eq(seasons.id, id));
}

// ─── Matches ─────────────────────────────────────────────────────────────────

export async function getMatchesBySeasonId(seasonId: number) {
  const db = getDb();
  return db.select().from(matches).where(eq(matches.seasonId, seasonId)).orderBy(desc(matches.playedAt));
}

export async function getAllMatches() {
  const db = getDb();
  return db.select().from(matches).orderBy(desc(matches.playedAt));
}

export async function getMatchById(id: number) {
  const db = getDb();
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createMatch(
  matchData: Omit<InsertMatch, "id" | "createdAt">,
  sets: Omit<InsertMatchSet, "id" | "matchId" | "setNumber">[]
) {
  const db = getDb();
  // libsql returns lastInsertRowid
  const result = await db.insert(matches).values(matchData);
  const matchId = Number((result as any).lastInsertRowid ?? (result as any)[0]?.insertId ?? 0);

  if (sets.length > 0) {
    await db.insert(matchSets).values(sets.map((s, i) => ({ ...s, matchId, setNumber: i + 1 })));
  }
  return matchId;
}

export async function updateMatch(
  id: number,
  data: { winningSide?: number; playedAt?: Date },
  sets?: Omit<InsertMatchSet, "id" | "matchId" | "setNumber">[]
) {
  const db = getDb();
  if (Object.keys(data).length > 0) {
    await db.update(matches).set(data).where(eq(matches.id, id));
  }
  if (sets) {
    await db.delete(matchSets).where(eq(matchSets.matchId, id));
    if (sets.length > 0) {
      await db.insert(matchSets).values(sets.map((s, i) => ({ ...s, matchId: id, setNumber: i + 1 })));
    }
  }
}

export async function deleteMatch(id: number) {
  const db = getDb();
  await db.delete(matchSets).where(eq(matchSets.matchId, id));
  await db.delete(matches).where(eq(matches.id, id));
}

export async function getMatchSetsByMatchId(matchId: number) {
  const db = getDb();
  return db.select().from(matchSets).where(eq(matchSets.matchId, matchId)).orderBy(matchSets.setNumber);
}

// ─── Rankings ────────────────────────────────────────────────────────────────

export interface PlayerRankingRow {
  playerId: number;
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  setsFor: number;
  setsAgainst: number;
  gamesPlayed: number;
}

/** Einzelrangliste: nur Singles-Spiele. Punkte: 3 Sieg, 1 Niederlage. */
export async function getPlayerRanking(seasonId: number | null): Promise<PlayerRankingRow[]> {
  const db = getDb();

  const allMatches = seasonId
    ? await db.select().from(matches).where(and(eq(matches.seasonId, seasonId), eq(matches.type, "singles")))
    : await db.select().from(matches).where(eq(matches.type, "singles"));

  // Load sets for ratio calculation
  const matchIds = allMatches.map(m => m.id);
  const allSets = matchIds.length > 0
    ? await db.select().from(matchSets).where(inArray(matchSets.matchId, matchIds))
    : [];

  const setsByMatch = new Map<number, typeof allSets>();
  for (const s of allSets) {
    if (!setsByMatch.has(s.matchId)) setsByMatch.set(s.matchId, []);
    setsByMatch.get(s.matchId)!.push(s);
  }

  const map = new Map<number, PlayerRankingRow>();
  const getOrCreate = (id: number): PlayerRankingRow => {
    if (!map.has(id)) map.set(id, { playerId: id, wins: 0, losses: 0, points: 0, pointsFor: 0, pointsAgainst: 0, setsFor: 0, setsAgainst: 0, gamesPlayed: 0 });
    return map.get(id)!;
  };

  for (const m of allMatches) {
    const p1 = getOrCreate(m.player1Id);
    const p3 = getOrCreate(m.player3Id);
    p1.gamesPlayed++; p3.gamesPlayed++;

    const sets = setsByMatch.get(m.id) ?? [];
    let pf1 = 0, pa1 = 0, sf1 = 0, sa1 = 0;
    for (const s of sets) {
      pf1 += s.scoreTeam1; pa1 += s.scoreTeam2;
      if (s.scoreTeam1 > s.scoreTeam2) sf1++; else sa1++;
    }
    p1.pointsFor += pf1; p1.pointsAgainst += pa1; p1.setsFor += sf1; p1.setsAgainst += sa1;
    p3.pointsFor += pa1; p3.pointsAgainst += pf1; p3.setsFor += sa1; p3.setsAgainst += sf1;

    if (m.winningSide === 1) {
      p1.wins++; p1.points += 3; p3.losses++; p3.points += 1;
    } else {
      p3.wins++; p3.points += 3; p1.losses++; p1.points += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
    const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
    return ratioB - ratioA;
  });
}

export interface PairRankingRow {
  player1Id: number;
  player2Id: number;
  matchType: "doubles" | "mixed";
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  setsFor: number;
  setsAgainst: number;
  gamesPlayed: number;
}

/** Paarungsrangliste: Doppel + Mixed. */
export async function getPairRanking(seasonId: number | null, matchTypeFilter?: "doubles" | "mixed"): Promise<PairRankingRow[]> {
  const db = getDb();

  let allMatches;
  if (seasonId && matchTypeFilter) {
    allMatches = await db.select().from(matches).where(and(eq(matches.seasonId, seasonId), eq(matches.type, matchTypeFilter)));
  } else if (seasonId) {
    allMatches = await db.select().from(matches).where(and(eq(matches.seasonId, seasonId), inArray(matches.type, ["doubles", "mixed"])));
  } else if (matchTypeFilter) {
    allMatches = await db.select().from(matches).where(eq(matches.type, matchTypeFilter));
  } else {
    allMatches = await db.select().from(matches).where(inArray(matches.type, ["doubles", "mixed"]));
  }

  const matchIds = allMatches.map(m => m.id);
  const allSets = matchIds.length > 0
    ? await db.select().from(matchSets).where(inArray(matchSets.matchId, matchIds))
    : [];

  const setsByMatch = new Map<number, typeof allSets>();
  for (const s of allSets) {
    if (!setsByMatch.has(s.matchId)) setsByMatch.set(s.matchId, []);
    setsByMatch.get(s.matchId)!.push(s);
  }

  const map = new Map<string, PairRankingRow>();
  const pairKey = (a: number, b: number, type: string) => `${Math.min(a, b)}-${Math.max(a, b)}-${type}`;

  const getOrCreate = (p1: number, p2: number, type: "doubles" | "mixed"): PairRankingRow => {
    const key = pairKey(p1, p2, type);
    if (!map.has(key)) {
      map.set(key, { player1Id: Math.min(p1, p2), player2Id: Math.max(p1, p2), matchType: type, wins: 0, losses: 0, points: 0, pointsFor: 0, pointsAgainst: 0, setsFor: 0, setsAgainst: 0, gamesPlayed: 0 });
    }
    return map.get(key)!;
  };

  for (const m of allMatches) {
    if (!m.player2Id || !m.player4Id) continue;
    const type = m.type as "doubles" | "mixed";
    const team1 = getOrCreate(m.player1Id, m.player2Id, type);
    const team2 = getOrCreate(m.player3Id, m.player4Id, type);
    team1.gamesPlayed++; team2.gamesPlayed++;

    const sets = setsByMatch.get(m.id) ?? [];
    let pf1 = 0, pa1 = 0, sf1 = 0, sa1 = 0;
    for (const s of sets) {
      pf1 += s.scoreTeam1; pa1 += s.scoreTeam2;
      if (s.scoreTeam1 > s.scoreTeam2) sf1++; else sa1++;
    }
    team1.pointsFor += pf1; team1.pointsAgainst += pa1; team1.setsFor += sf1; team1.setsAgainst += sa1;
    team2.pointsFor += pa1; team2.pointsAgainst += pf1; team2.setsFor += sa1; team2.setsAgainst += sf1;

    if (m.winningSide === 1) {
      team1.wins++; team1.points += 3; team2.losses++; team2.points += 1;
    } else {
      team2.wins++; team2.points += 3; team1.losses++; team1.points += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
    const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
    return ratioB - ratioA;
  });
}

/** Gesamtstatistiken über alle Saisons und Spielmodi. */
export async function getOverallPlayerStats() {
  const db = getDb();
  const allMatches = await db.select().from(matches);
  const map = new Map<number, { playerId: number; wins: number; losses: number; gamesPlayed: number; points: number }>();

  const get = (id: number) => {
    if (!map.has(id)) map.set(id, { playerId: id, wins: 0, losses: 0, gamesPlayed: 0, points: 0 });
    return map.get(id)!;
  };

  for (const m of allMatches) {
    const ids1 = [m.player1Id, m.player2Id].filter(Boolean) as number[];
    const ids2 = [m.player3Id, m.player4Id].filter(Boolean) as number[];
    for (const id of ids1) get(id).gamesPlayed++;
    for (const id of ids2) get(id).gamesPlayed++;
    if (m.winningSide === 1) {
      for (const id of ids1) { get(id).wins++; get(id).points += 3; }
      for (const id of ids2) { get(id).losses++; get(id).points += 1; }
    } else {
      for (const id of ids2) { get(id).wins++; get(id).points += 3; }
      for (const id of ids1) { get(id).losses++; get(id).points += 1; }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points);
}
