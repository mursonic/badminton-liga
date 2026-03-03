import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMatch,
  InsertMatchSet,
  InsertPlayer,
  InsertSeason,
  InsertUser,
  matchSets,
  matches,
  players,
  seasons,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Players ─────────────────────────────────────────────────────────────────

export async function getAllPlayers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players).orderBy(players.name);
}

export async function getActivePlayers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players).where(eq(players.active, true)).orderBy(players.name);
}

export async function createPlayer(data: Omit<InsertPlayer, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(players).values(data);
  return result;
}

export async function updatePlayer(id: number, data: Partial<Omit<InsertPlayer, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function deletePlayer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(players).where(eq(players.id, id));
}

// ─── Seasons ─────────────────────────────────────────────────────────────────

export async function getAllSeasons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(seasons).orderBy(desc(seasons.year));
}

export async function getActiveSeason() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
  return result[0] ?? null;
}

export async function createSeason(data: Omit<InsertSeason, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deactivate all others first
  await db.update(seasons).set({ isActive: false });
  await db.insert(seasons).values({ ...data, isActive: true });
}

export async function setActiveSeason(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(seasons).set({ isActive: false });
  await db.update(seasons).set({ isActive: true }).where(eq(seasons.id, id));
}

// ─── Matches ─────────────────────────────────────────────────────────────────

export async function getMatchesBySeasonId(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).where(eq(matches.seasonId, seasonId)).orderBy(desc(matches.playedAt));
}

export async function getAllMatches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).orderBy(desc(matches.playedAt));
}

export async function getMatchById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createMatch(
  matchData: Omit<InsertMatch, "id" | "createdAt">,
  sets: Omit<InsertMatchSet, "id" | "matchId" | "setNumber">[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertResult = await db.insert(matches).values(matchData);
  const matchId = Number((insertResult as any)[0].insertId);

  if (sets.length > 0) {
    await db.insert(matchSets).values(sets.map((s, i) => ({ ...s, matchId, setNumber: i + 1 })));
  }
  return matchId;
}

export async function deleteMatch(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(matchSets).where(eq(matchSets.matchId, id));
  await db.delete(matches).where(eq(matches.id, id));
}

export async function getMatchSetsByMatchId(matchId: number) {
  const db = await getDb();
  if (!db) return [];
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

/**
 * Berechnet die Einzelrangliste für eine Saison (oder alle Saisons wenn seasonId = null).
 * Punkte: 3 pro Sieg, 1 pro Niederlage.
 */
export async function getPlayerRanking(seasonId: number | null): Promise<PlayerRankingRow[]> {
  const db = await getDb();
  if (!db) return [];

  const whereClause = seasonId ? eq(matches.seasonId, seasonId) : undefined;
  const allMatches = whereClause
    ? await db.select().from(matches).where(and(whereClause, eq(matches.matchType, "singles")))
    : await db.select().from(matches).where(eq(matches.matchType, "singles"));

  const map = new Map<number, PlayerRankingRow>();

  const getOrCreate = (id: number): PlayerRankingRow => {
    if (!map.has(id)) {
      map.set(id, { playerId: id, wins: 0, losses: 0, points: 0, pointsFor: 0, pointsAgainst: 0, setsFor: 0, setsAgainst: 0, gamesPlayed: 0 });
    }
    return map.get(id)!;
  };

  for (const m of allMatches) {
    const p1 = getOrCreate(m.team1Player1Id);
    const p2 = getOrCreate(m.team2Player1Id);
    p1.gamesPlayed++;
    p2.gamesPlayed++;
    p1.pointsFor += m.team1TotalPoints;
    p1.pointsAgainst += m.team2TotalPoints;
    p1.setsFor += m.team1Sets;
    p1.setsAgainst += m.team2Sets;
    p2.pointsFor += m.team2TotalPoints;
    p2.pointsAgainst += m.team1TotalPoints;
    p2.setsFor += m.team2Sets;
    p2.setsAgainst += m.team1Sets;
    if (m.winner === "team1") {
      p1.wins++; p1.points += 3;
      p2.losses++; p2.points += 1;
    } else {
      p2.wins++; p2.points += 3;
      p1.losses++; p1.points += 1;
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

/**
 * Berechnet die Paarungsrangliste (Doppel + Mixed) für eine Saison.
 */
export async function getPairRanking(seasonId: number | null, matchTypeFilter?: "doubles" | "mixed"): Promise<PairRankingRow[]> {
  const db = await getDb();
  if (!db) return [];

  let allMatches;
  if (seasonId) {
    allMatches = await db.select().from(matches).where(
      and(
        eq(matches.seasonId, seasonId),
        matchTypeFilter ? eq(matches.matchType, matchTypeFilter) : sql`matches.matchType IN ('doubles', 'mixed')`
      )
    );
  } else {
    allMatches = await db.select().from(matches).where(
      matchTypeFilter ? eq(matches.matchType, matchTypeFilter) : sql`matches.matchType IN ('doubles', 'mixed')`
    );
  }

  const map = new Map<string, PairRankingRow>();

  const pairKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

  const getOrCreate = (p1: number, p2: number, type: "doubles" | "mixed"): PairRankingRow => {
    const key = `${pairKey(p1, p2)}-${type}`;
    if (!map.has(key)) {
      map.set(key, {
        player1Id: Math.min(p1, p2),
        player2Id: Math.max(p1, p2),
        matchType: type,
        wins: 0, losses: 0, points: 0,
        pointsFor: 0, pointsAgainst: 0,
        setsFor: 0, setsAgainst: 0, gamesPlayed: 0,
      });
    }
    return map.get(`${pairKey(p1, p2)}-${type}`)!;
  };

  for (const m of allMatches) {
    if (!m.team1Player2Id || !m.team2Player2Id) continue;
    const type = m.matchType as "doubles" | "mixed";
    const team1 = getOrCreate(m.team1Player1Id, m.team1Player2Id, type);
    const team2 = getOrCreate(m.team2Player1Id, m.team2Player2Id, type);
    team1.gamesPlayed++; team2.gamesPlayed++;
    team1.pointsFor += m.team1TotalPoints; team1.pointsAgainst += m.team2TotalPoints;
    team1.setsFor += m.team1Sets; team1.setsAgainst += m.team2Sets;
    team2.pointsFor += m.team2TotalPoints; team2.pointsAgainst += m.team1TotalPoints;
    team2.setsFor += m.team2Sets; team2.setsAgainst += m.team1Sets;
    if (m.winner === "team1") {
      team1.wins++; team1.points += 3;
      team2.losses++; team2.points += 1;
    } else {
      team2.wins++; team2.points += 3;
      team1.losses++; team1.points += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
    const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
    return ratioB - ratioA;
  });
}

/**
 * Gesamtstatistiken: Bester Spieler (alle Saisons, alle Spielmodi)
 */
export async function getOverallPlayerStats() {
  const db = await getDb();
  if (!db) return [];

  const allMatches = await db.select().from(matches);
  const map = new Map<number, { playerId: number; wins: number; losses: number; gamesPlayed: number; points: number }>();

  const get = (id: number) => {
    if (!map.has(id)) map.set(id, { playerId: id, wins: 0, losses: 0, gamesPlayed: 0, points: 0 });
    return map.get(id)!;
  };

  for (const m of allMatches) {
    const ids1 = [m.team1Player1Id, m.team1Player2Id].filter(Boolean) as number[];
    const ids2 = [m.team2Player1Id, m.team2Player2Id].filter(Boolean) as number[];
    for (const id of ids1) { get(id).gamesPlayed++; }
    for (const id of ids2) { get(id).gamesPlayed++; }
    if (m.winner === "team1") {
      for (const id of ids1) { get(id).wins++; get(id).points += 3; }
      for (const id of ids2) { get(id).losses++; get(id).points += 1; }
    } else {
      for (const id of ids2) { get(id).wins++; get(id).points += 3; }
      for (const id of ids1) { get(id).losses++; get(id).points += 1; }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points);
}
