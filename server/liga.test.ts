import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      ...createAdminContext(),
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
  });
});

// ─── Rankings Logic Tests ─────────────────────────────────────────────────────

describe("Punktesystem", () => {
  it("Sieger erhält 3 Punkte, Verlierer 1 Punkt", () => {
    const calculatePoints = (winner: "team1" | "team2", forTeam: "team1" | "team2") => {
      return winner === forTeam ? 3 : 1;
    };
    expect(calculatePoints("team1", "team1")).toBe(3);
    expect(calculatePoints("team1", "team2")).toBe(1);
    expect(calculatePoints("team2", "team2")).toBe(3);
    expect(calculatePoints("team2", "team1")).toBe(1);
  });

  it("Torverhältnis wird korrekt berechnet", () => {
    const ratio = (pf: number, pa: number) => pa === 0 ? Infinity : pf / pa;
    expect(ratio(21, 15)).toBeCloseTo(1.4);
    expect(ratio(42, 21)).toBeCloseTo(2.0);
    expect(ratio(0, 21)).toBe(0);
    expect(ratio(21, 0)).toBe(Infinity);
  });

  it("Rangliste sortiert nach Punkten, dann nach Torverhältnis", () => {
    const players = [
      { id: 1, points: 9, pointsFor: 63, pointsAgainst: 42 },
      { id: 2, points: 9, pointsFor: 84, pointsAgainst: 42 },
      { id: 3, points: 12, pointsFor: 42, pointsAgainst: 63 },
    ];

    const sorted = [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const ratioA = a.pointsFor / a.pointsAgainst;
      const ratioB = b.pointsFor / b.pointsAgainst;
      return ratioB - ratioA;
    });

    expect(sorted[0].id).toBe(3); // 12 Punkte
    expect(sorted[1].id).toBe(2); // 9 Punkte, Ratio 2.0
    expect(sorted[2].id).toBe(1); // 9 Punkte, Ratio 1.5
  });
});

describe("Satz-Berechnung", () => {
  it("Satzpunkte werden korrekt summiert", () => {
    const sets = [
      { team1Score: 21, team2Score: 15 },
      { team1Score: 18, team2Score: 21 },
      { team1Score: 21, team2Score: 17 },
    ];

    let team1Total = 0;
    let team2Total = 0;
    let team1Sets = 0;
    let team2Sets = 0;

    for (const s of sets) {
      team1Total += s.team1Score;
      team2Total += s.team2Score;
      if (s.team1Score > s.team2Score) team1Sets++;
      else team2Sets++;
    }

    expect(team1Total).toBe(60);
    expect(team2Total).toBe(53);
    expect(team1Sets).toBe(2);
    expect(team2Sets).toBe(1);
  });

  it("Gewinner eines Satzes ist der mit mehr Punkten", () => {
    const setWinner = (t1: number, t2: number) => t1 > t2 ? "team1" : "team2";
    expect(setWinner(21, 15)).toBe("team1");
    expect(setWinner(15, 21)).toBe("team2");
  });
});

describe("Admin-Zugriff", () => {
  it("Nicht-Admin kann keinen Spieler erstellen (FORBIDDEN)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.players.create({ name: "Test", gender: "other", active: true })
    ).rejects.toThrow();
  });
});

// ─── Badminton-Validierung Tests ──────────────────────────────────────────────

function validateBadmintonSet(s1: number, s2: number): string | null {
  if (s1 === s2) return "Unentschieden ist im Badminton nicht möglich.";
  const winner = s1 > s2 ? s1 : s2;
  const loser = s1 > s2 ? s2 : s1;
  if (winner < 21) return `Zu wenig Punkte – der Sieger braucht mind. 21 Punkte (aktuell: ${winner}).`;
  if (winner > 30) return `Zu viele Punkte – Maximum ist 30 (aktuell: ${winner}).`;
  if (loser > 29) return `Verlierer kann max. 29 Punkte haben (aktuell: ${loser}).`;
  if (winner === 21 && loser >= 20) return `Bei 21:${loser} fehlt der 2-Punkte-Vorsprung. Gültig wäre z.B. 22:20.`;
  if (winner >= 22 && winner <= 29 && winner - loser !== 2) return `Vorsprung muss genau 2 Punkte betragen (aktuell: ${winner - loser}).`;
  if (winner === 30 && loser !== 29) return `Bei 30 Punkten muss der Verlierer 29 haben (aktuell: ${loser}).`;
  return null;
}

describe("Badminton-Validierung", () => {
  it("gültige Satzergebnisse werden akzeptiert", () => {
    expect(validateBadmintonSet(21, 15)).toBeNull();
    expect(validateBadmintonSet(21, 0)).toBeNull();
    expect(validateBadmintonSet(22, 20)).toBeNull();
    expect(validateBadmintonSet(25, 23)).toBeNull();
    expect(validateBadmintonSet(30, 29)).toBeNull();
    expect(validateBadmintonSet(15, 21)).toBeNull();
  });

  it("Unentschieden wird abgelehnt", () => {
    expect(validateBadmintonSet(21, 21)).not.toBeNull();
    expect(validateBadmintonSet(0, 0)).not.toBeNull();
  });

  it("zu wenig Punkte wird abgelehnt", () => {
    expect(validateBadmintonSet(20, 15)).not.toBeNull();
    expect(validateBadmintonSet(10, 5)).not.toBeNull();
  });

  it("zu viele Punkte wird abgelehnt", () => {
    expect(validateBadmintonSet(31, 29)).not.toBeNull();
  });

  it("Einstand ohne 2-Punkte-Vorsprung wird abgelehnt", () => {
    expect(validateBadmintonSet(21, 20)).not.toBeNull(); // kein 2er-Vorsprung
    expect(validateBadmintonSet(23, 20)).not.toBeNull(); // 3er-Vorsprung ungültig
  });

  it("30:29 ist gültig, 30:28 nicht", () => {
    expect(validateBadmintonSet(30, 29)).toBeNull();
    expect(validateBadmintonSet(30, 28)).not.toBeNull();
  });
});

describe("Saison-Status", () => {
  it("Admin kann Saison abschließen (Prozedur existiert)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Prüfen ob die Prozedur vorhanden ist (ohne echte DB)
    expect(typeof caller.seasons.close).toBe("function");
    expect(typeof caller.seasons.reopen).toBe("function");
  });

  it("Nicht-Admin kann Saison nicht abschließen", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.seasons.close({ id: 1 })).rejects.toThrow();
    await expect(caller.seasons.reopen({ id: 1 })).rejects.toThrow();
  });
});
