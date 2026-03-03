import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createMatch,
  createPlayer,
  createSeason,
  deleteMatch,
  deletePlayer,
  getActivePlayers,
  getActiveSeason,
  getAllMatches,
  getAllPlayers,
  getAllSeasons,
  getMatchById,
  getMatchesBySeasonId,
  getMatchSetsByMatchId,
  getOverallPlayerStats,
  getPairRanking,
  getPlayerRanking,
  setActiveSeason,
  updatePlayer,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Admins haben Zugriff." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Players ───────────────────────────────────────────────────────────────
  players: router({
    list: publicProcedure.query(() => getAllPlayers()),
    listActive: publicProcedure.query(() => getActivePlayers()),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          nickname: z.string().max(64).optional(),
          gender: z.enum(["male", "female", "other"]).default("other"),
          active: z.boolean().default(true),
        })
      )
      .mutation(({ input }) => createPlayer(input)),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(128).optional(),
          nickname: z.string().max(64).optional().nullable(),
          gender: z.enum(["male", "female", "other"]).optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updatePlayer(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePlayer(input.id)),
  }),

  // ─── Seasons ───────────────────────────────────────────────────────────────
  seasons: router({
    list: publicProcedure.query(() => getAllSeasons()),
    active: publicProcedure.query(() => getActiveSeason()),

    create: adminProcedure
      .input(
        z.object({
          year: z.number().min(2000).max(2100),
          name: z.string().min(1).max(64),
        })
      )
      .mutation(({ input }) => createSeason({ ...input, isActive: true })),

    setActive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => setActiveSeason(input.id)),
  }),

  // ─── Matches ───────────────────────────────────────────────────────────────
  matches: router({
    listBySeason: publicProcedure
      .input(z.object({ seasonId: z.number() }))
      .query(({ input }) => getMatchesBySeasonId(input.seasonId)),

    listAll: publicProcedure.query(() => getAllMatches()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const match = await getMatchById(input.id);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const sets = await getMatchSetsByMatchId(input.id);
        return { ...match, sets };
      }),

    create: adminProcedure
      .input(
        z.object({
          seasonId: z.number(),
          matchType: z.enum(["singles", "doubles", "mixed"]),
          team1Player1Id: z.number(),
          team1Player2Id: z.number().optional().nullable(),
          team2Player1Id: z.number(),
          team2Player2Id: z.number().optional().nullable(),
          winner: z.enum(["team1", "team2"]),
          playedAt: z.string().optional(), // ISO string
          notes: z.string().optional().nullable(),
          sets: z.array(
            z.object({
              team1Score: z.number().min(0),
              team2Score: z.number().min(0),
            })
          ).min(1),
        })
      )
      .mutation(async ({ input }) => {
        const { sets, playedAt, ...matchData } = input;

        // Berechne Gesamtpunkte und Sätze
        let team1TotalPoints = 0;
        let team2TotalPoints = 0;
        let team1Sets = 0;
        let team2Sets = 0;

        for (const s of sets) {
          team1TotalPoints += s.team1Score;
          team2TotalPoints += s.team2Score;
          if (s.team1Score > s.team2Score) team1Sets++;
          else team2Sets++;
        }

        const matchId = await createMatch(
          {
            ...matchData,
            team1TotalPoints,
            team2TotalPoints,
            team1Sets,
            team2Sets,
            playedAt: playedAt ? new Date(playedAt) : new Date(),
          },
          sets
        );
        return { matchId };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteMatch(input.id)),
  }),

  // ─── Rankings ──────────────────────────────────────────────────────────────
  rankings: router({
    players: publicProcedure
      .input(z.object({ seasonId: z.number().nullable() }))
      .query(({ input }) => getPlayerRanking(input.seasonId)),

    pairs: publicProcedure
      .input(
        z.object({
          seasonId: z.number().nullable(),
          matchType: z.enum(["doubles", "mixed"]).optional(),
        })
      )
      .query(({ input }) => getPairRanking(input.seasonId, input.matchType)),
  }),

  // ─── Stats ─────────────────────────────────────────────────────────────────
  stats: router({
    overallPlayers: publicProcedure.query(() => getOverallPlayerStats()),
  }),
});

export type AppRouter = typeof appRouter;
