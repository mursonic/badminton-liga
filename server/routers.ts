import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  countAdminUsers,
  createAdminUser,
  createMatch,
  createPlayer,
  createSeason,
  deleteMatch,
  deletePlayer,
  deleteSeason,
  getActivePlayers,
  getActiveSeason,
  getAdminByUsername,
  getAllMatches,
  getAllPlayers,
  getAllSeasons,
  getMatchById,
  getMatchesBySeason,
  getSetsByMatch,
  computePairRanking,
  computePlayerRanking,
  setActiveSeason,
  updateAdminPassword,
  updateMatch,
  updateMatchSets,
  updatePlayer,
  updateSeason,
  createMatchSets,
} from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "atsv-badminton-liga-secret-change-me"
);
const SESSION_COOKIE = COOKIE_NAME;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Admin guard – all users in context are already admins, but keep for clarity
const adminProcedure = protectedProcedure;

export const appRouter = router({
  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    /** First-time setup: create the initial admin account */
    setup: publicProcedure
      .input(z.object({ username: z.string().min(3), password: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const count = await countAdminUsers();
        if (count > 0) throw new TRPCError({ code: "FORBIDDEN", message: "Setup bereits abgeschlossen." });
        const hash = await bcrypt.hash(input.password, 12);
        await createAdminUser({ username: input.username, passwordHash: hash });
        // Auto-login after setup
        const token = await new SignJWT({ id: 1, username: input.username })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("365d")
          .sign(JWT_SECRET);
        ctx.res.cookie(SESSION_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: ONE_YEAR_MS,
          path: "/",
        });
        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminByUsername(input.username);
        if (!admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültige Anmeldedaten." });
        const valid = await bcrypt.compare(input.password, admin.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültige Anmeldedaten." });

        const token = await new SignJWT({ id: admin.id, username: admin.username })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("365d")
          .sign(JWT_SECRET);

        ctx.res.cookie(SESSION_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: ONE_YEAR_MS,
          path: "/",
        });
        return { success: true, username: admin.username };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(SESSION_COOKIE, { path: "/", maxAge: -1 });
      return { success: true } as const;
    }),

    /** Check if initial setup is needed */
    needsSetup: publicProcedure.query(async () => {
      const count = await countAdminUsers();
      return count === 0;
    }),

    /** Change admin password */
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminByUsername(ctx.user!.username);
        if (!admin) throw new TRPCError({ code: "NOT_FOUND" });
        const valid = await bcrypt.compare(input.currentPassword, admin.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Aktuelles Passwort ist falsch." });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateAdminPassword(admin.id, newHash);
        return { success: true };
      }),
  }),

  // ─── Players ───────────────────────────────────────────────────────────────
  players: router({
    list: publicProcedure.query(() => getAllPlayers()),
    listActive: publicProcedure.query(() => getActivePlayers()),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1).max(128), active: z.boolean().default(true), gender: z.enum(["male", "female", "other"]).default("other") }))
      .mutation(({ input }) => createPlayer(input)),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(128).optional(), active: z.boolean().optional(), gender: z.enum(["male", "female", "other"]).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updatePlayer(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePlayer(input.id)),
  }),

  // ─── Seasons ───────────────────────────────────────────────────────────────
  seasons: router({
    list: publicProcedure.query(() => getAllSeasons()),
    active: publicProcedure.query(async () => (await getActiveSeason()) ?? null),

    create: adminProcedure
      .input(z.object({ year: z.number().min(2000).max(2100), name: z.string().min(1).max(64) }))
      .mutation(({ input }) => createSeason({ ...input, isActive: true })),

    setActive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => setActiveSeason(input.id)),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(64).optional(), year: z.number().min(2000).max(2100).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateSeason(id, data); }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteSeason(input.id); return { success: true }; }),
  }),

  // ─── Matches ───────────────────────────────────────────────────────────────
  matches: router({
    listBySeason: publicProcedure
      .input(z.object({ seasonId: z.number() }))
      .query(({ input }) => getMatchesBySeason(input.seasonId)),

    listAll: publicProcedure.query(() => getAllMatches()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const match = await getMatchById(input.id);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const sets = await getSetsByMatch(input.id);
        return { ...match, sets };
      }),

    create: adminProcedure
      .input(
        z.object({
          seasonId: z.number(),
          type: z.enum(["singles", "doubles", "mixed"]),
          player1Id: z.number(),
          player2Id: z.number().optional().nullable(),
          player3Id: z.number(),
          player4Id: z.number().optional().nullable(),
          winningSide: z.number().min(1).max(2),
          playedAt: z.string().optional(),
          sets: z.array(z.object({ scoreTeam1: z.number().min(0), scoreTeam2: z.number().min(0) })).min(1),
        })
      )
      .mutation(async ({ input }) => {
        const { sets, playedAt, ...matchData } = input;
        const matchId = await createMatch({ ...matchData });
        await createMatchSets(sets.map((s, i) => ({ matchId, setNumber: i + 1, scoreTeam1: s.scoreTeam1, scoreTeam2: s.scoreTeam2 })));
        return { matchId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        winningSide: z.number().min(1).max(2).optional(),
        playedAt: z.string().optional(),
        sets: z.array(z.object({ scoreTeam1: z.number().min(0), scoreTeam2: z.number().min(0) })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, sets, playedAt, ...data } = input;
        await updateMatch(id, { ...data });
        if (sets) {
          await updateMatchSets(id, sets.map((s, i) => ({ matchId: id, setNumber: i + 1, scoreTeam1: s.scoreTeam1, scoreTeam2: s.scoreTeam2 })));
        }
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteMatch(input.id)),
  }),

  // ─── Rankings ──────────────────────────────────────────────────────────────
  rankings: router({
    players: publicProcedure
      .input(z.object({ seasonId: z.number().nullable() }))
      .query(({ input }) => computePlayerRanking(input.seasonId)),

    pairs: publicProcedure
      .input(z.object({ seasonId: z.number().nullable(), matchType: z.enum(["doubles", "mixed"]).optional() }))
      .query(({ input }) => computePairRanking(input.seasonId, input.matchType)),
  }),

  // ─── Stats ─────────────────────────────────────────────────────────────────
  stats: router({
    overallPlayers: publicProcedure.query(async () => {
      const ranking = await computePlayerRanking(null);
      return ranking.slice(0, 10);
    }),
  }),
});

export type AppRouter = typeof appRouter;
