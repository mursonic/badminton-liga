import { eq, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export async function getAdminByUsername(username: string) {
  const db = getDb();
  const result = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  return result[0] ?? null;
}

export async function createAdminUser(data: Omit<InsertAdminUser, "id" | "createdAt">) {
  const db = getDb();
  await db.insert(adminUsers).values({ ...data, createdAt: Date.now() });
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
  await db.insert(players).values({ ...data, createdAt: Date.now() });
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
  return db.select().from(seasons).orderBy(seasons.year);
}

export async function getActiveSeason() {
  const db = getDb();
  const result = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
  return result[0] ?? null;
}

export async function createSeason(data: Omit<InsertSeason, "id" | "createdAt">) {
  const db = getDb();
  await db.insert(seasons).values({ ...data, createdAt: Date.now() });
}

export async function updateSeason(id: number, data: Partial<Omit<InsertSeason, "id" | "createdAt">>) {
  const db = getDb();
  await db.update(seasons).set(data).where(eq(seasons.id, id));
}

export async function deleteSeason(id: number) {
  const db = getDb();
  await db.delete(seasons).where(eq(seasons.id, id));
}

export async function setActiveSeason(id: number) {
  const db = getDb();
  // Deactivate all, then activate the chosen one
  await db.update(seasons).set({ isActive: false });
  await db.update(seasons).set({ isActive: true }).where(eq(seasons.id, id));
}

// ─── Matches ─────────────────────────────────────────────────────────────────

export async function getMatchesBySeason(seasonId: number) {
  const db = getDb();
  return db.select().from(matches).where(eq(matches.seasonId, seasonId)).orderBy(matches.playedAt);
}

export async function getAllMatches() {
  const db = getDb();
  return db.select().from(matches).orderBy(matches.playedAt);
}

export async function getMatchById(id: number) {
  const db = getDb();
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createMatch(data: Omit<InsertMatch, "id" | "createdAt" | "playedAt">) {
  const db = getDb();
  const now = Date.now();
  const result = await db.insert(matches).values({
    seasonId: data.seasonId,
    type: data.type,
    player1Id: data.player1Id,
    player2Id: data.player2Id ?? null,
    player3Id: data.player3Id,
    player4Id: data.player4Id ?? null,
    winningSide: data.winningSide,
    playedAt: now,
    createdAt: now,
  });
  // Drizzle mysql2 returns [ResultSetHeader, ...] – insertId is on index 0
  const insertId = (result as any)?.[0]?.insertId ?? (result as any)?.insertId;
  if (!insertId) throw new Error('Failed to get insertId from match insert');
  return insertId as number;
}

export async function updateMatch(
  id: number,
  data: Partial<Pick<InsertMatch, "winningSide" | "type" | "player1Id" | "player2Id" | "player3Id" | "player4Id">>
) {
  const db = getDb();
  await db.update(matches).set(data).where(eq(matches.id, id));
}

export async function deleteMatch(id: number) {
  const db = getDb();
  await db.delete(matchSets).where(eq(matchSets.matchId, id));
  await db.delete(matches).where(eq(matches.id, id));
}

// ─── Match Sets ───────────────────────────────────────────────────────────────

export async function getSetsByMatch(matchId: number) {
  const db = getDb();
  return db.select().from(matchSets).where(eq(matchSets.matchId, matchId)).orderBy(matchSets.setNumber);
}

export async function getSetsByMatches(matchIds: number[]) {
  if (matchIds.length === 0) return [];
  const db = getDb();
  return db.select().from(matchSets).where(inArray(matchSets.matchId, matchIds));
}

export async function createMatchSets(sets: Omit<InsertMatchSet, "id">[]) {
  if (sets.length === 0) return;
  const db = getDb();
  // Use raw SQL to avoid Drizzle camelCase column mapping issues with 'matchId'
  for (const s of sets) {
    await db.execute(
      sql`INSERT INTO match_sets (matchId, setNumber, score_team1, score_team2) VALUES (${s.matchId}, ${s.setNumber}, ${s.scoreTeam1}, ${s.scoreTeam2})`
    );
  }
}

export async function updateMatchSets(matchId: number, sets: Omit<InsertMatchSet, "id">[]) {
  const db = getDb();
  await db.execute(sql`DELETE FROM match_sets WHERE matchId = ${matchId}`);
  for (const s of sets) {
    await db.execute(
      sql`INSERT INTO match_sets (matchId, setNumber, score_team1, score_team2) VALUES (${s.matchId}, ${s.setNumber}, ${s.scoreTeam1}, ${s.scoreTeam2})`
    );
  }
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

export type PlayerRankRow = {
  playerId: number;
  points: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
};

export async function computePlayerRanking(seasonId: number | null): Promise<PlayerRankRow[]> {
  // Load all relevant matches
  const allMatches = seasonId
    ? await getMatchesBySeason(seasonId)
    : await getAllMatches();

  const singleMatches = allMatches.filter(m => m.type === "singles");
  if (singleMatches.length === 0) return [];

  const matchIds = singleMatches.map(m => m.id);
  const allSets = await getSetsByMatches(matchIds);
  const setsByMatch = new Map<number, typeof allSets>();
  for (const s of allSets) {
    if (!setsByMatch.has(s.matchId)) setsByMatch.set(s.matchId, []);
    setsByMatch.get(s.matchId)!.push(s);
  }

  const stats = new Map<number, PlayerRankRow>();
  const ensure = (id: number) => {
    if (!stats.has(id)) stats.set(id, { playerId: id, points: 0, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0 });
    return stats.get(id)!;
  };

  for (const m of singleMatches) {
    const sets = setsByMatch.get(m.id) ?? [];
    const pf1 = sets.reduce((a, s) => a + s.scoreTeam1, 0);
    const pa1 = sets.reduce((a, s) => a + s.scoreTeam2, 0);

    const p1 = ensure(m.player1Id);
    const p2 = ensure(m.player3Id);

    p1.gamesPlayed++;
    p2.gamesPlayed++;
    p1.pointsFor += pf1;
    p1.pointsAgainst += pa1;
    p2.pointsFor += pa1;
    p2.pointsAgainst += pf1;

    if (m.winningSide === 1) {
      p1.wins++; p1.points += 3;
      p2.losses++; p2.points += 1;
    } else {
      p2.wins++; p2.points += 3;
      p1.losses++; p1.points += 1;
    }
  }

  return Array.from(stats.values()).sort((a, b) =>
    b.points - a.points || (b.pointsFor / (b.pointsAgainst || 1)) - (a.pointsFor / (a.pointsAgainst || 1))
  );
}

export type PairRankRow = {
  player1Id: number;
  player2Id: number;
  matchType: "doubles" | "mixed";
  points: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
};

export async function computePairRanking(
  seasonId: number | null,
  matchType?: "doubles" | "mixed"
): Promise<PairRankRow[]> {
  const allMatches = seasonId
    ? await getMatchesBySeason(seasonId)
    : await getAllMatches();

  const pairMatches = allMatches.filter(m =>
    (m.type === "doubles" || m.type === "mixed") &&
    (!matchType || m.type === matchType)
  );
  if (pairMatches.length === 0) return [];

  const matchIds = pairMatches.map(m => m.id);
  const allSets = await getSetsByMatches(matchIds);
  const setsByMatch = new Map<number, typeof allSets>();
  for (const s of allSets) {
    if (!setsByMatch.has(s.matchId)) setsByMatch.set(s.matchId, []);
    setsByMatch.get(s.matchId)!.push(s);
  }

  const stats = new Map<string, PairRankRow>();
  const pairKey = (a: number, b: number, type: string) => `${Math.min(a, b)}_${Math.max(a, b)}_${type}`;

  const ensure = (p1: number, p2: number, type: "doubles" | "mixed"): PairRankRow => {
    const key = pairKey(p1, p2, type);
    if (!stats.has(key)) {
      stats.set(key, {
        player1Id: Math.min(p1, p2),
        player2Id: Math.max(p1, p2),
        matchType: type,
        points: 0, wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0,
      });
    }
    return stats.get(key)!;
  };

  for (const m of pairMatches) {
    if (!m.player2Id || !m.player4Id) continue;
    const sets = setsByMatch.get(m.id) ?? [];
    const pf1 = sets.reduce((a, s) => a + s.scoreTeam1, 0);
    const pa1 = sets.reduce((a, s) => a + s.scoreTeam2, 0);
    const type = m.type as "doubles" | "mixed";

    const t1 = ensure(m.player1Id, m.player2Id, type);
    const t2 = ensure(m.player3Id, m.player4Id, type);

    t1.gamesPlayed++; t2.gamesPlayed++;
    t1.pointsFor += pf1; t1.pointsAgainst += pa1;
    t2.pointsFor += pa1; t2.pointsAgainst += pf1;

    if (m.winningSide === 1) {
      t1.wins++; t1.points += 3;
      t2.losses++; t2.points += 1;
    } else {
      t2.wins++; t2.points += 3;
      t1.losses++; t1.points += 1;
    }
  }

  return Array.from(stats.values()).sort((a, b) =>
    b.points - a.points || (b.pointsFor / (b.pointsAgainst || 1)) - (a.pointsFor / (a.pointsAgainst || 1))
  );
}
