import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Trophy, Users, Swords, CalendarDays, PlusCircle, TrendingUp, Medal, Users2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: activeSeason } = trpc.seasons.active.useQuery();
  const { data: players } = trpc.players.listActive.useQuery();
  const { data: ranking } = trpc.rankings.players.useQuery({ seasonId: activeSeason?.id ?? null });
  const { data: pairsRanking } = trpc.rankings.pairs.useQuery({ seasonId: activeSeason?.id ?? null });
  const { data: matches } = trpc.matches.listBySeason.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason?.id }
  );

  const top3 = ranking?.slice(0, 3) ?? [];
  const top3Pairs = pairsRanking?.slice(0, 3) ?? [];
  const recentMatches = matches?.slice(0, 5) ?? [];

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const matchTypeLabel: Record<string, string> = {
    singles: "Einzel",
    doubles: "Doppel",
    mixed: "Mixed",
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              ATSV Badminton Liga
            </h1>
            {activeSeason ? (
              <p className="text-muted-foreground mt-1">
                Aktive Saison: <span className="text-primary font-medium">{activeSeason.name}</span>
              </p>
            ) : (
              <p className="text-muted-foreground mt-1">Keine aktive Saison – bitte eine Saison anlegen.</p>
            )}
          </div>
          {isAdmin && (
            <Button onClick={() => setLocation("/matches/new")} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Spiel erfassen
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Aktive Spieler"
            value={players?.length ?? 0}
          />
          <StatCard
            icon={<Swords className="h-5 w-5 text-primary" />}
            label="Gespielte Spiele"
            value={matches?.length ?? 0}
          />
          <StatCard
            icon={<Trophy className="h-5 w-5 text-primary" />}
            label="Ranglisten-Einträge"
            value={ranking?.length ?? 0}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-primary" />}
            label="Saison"
            value={activeSeason?.year ?? "–"}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top 3 Einzelspieler */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top Spieler
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/ranking/players")} className="text-muted-foreground text-xs">
                Alle ansehen →
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Noch keine Einzelspiele erfasst.</p>
              ) : (
                top3.map((row, i) => {
                  const player = playerMap.get(row.playerId);
                  return (
                    <div key={row.playerId} className="flex items-center gap-3">
                      <RankBadge rank={i + 1} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{player?.name ?? `Spieler #${row.playerId}`}</p>
                        <p className="text-xs text-muted-foreground">{row.wins} gewonnene Spiele</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{row.points} Pkt</p>
                        <p className="text-xs text-muted-foreground">{row.wins}S / {row.losses}N</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Top 3 Paarungen */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users2 className="h-5 w-5 text-primary" />
                Top Paarungen
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/ranking/pairs")} className="text-muted-foreground text-xs">
                Alle ansehen →
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Pairs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Noch keine Doppel-/Mixed-Spiele erfasst.</p>
              ) : (
                top3Pairs.map((row, i) => {
                  const p1 = playerMap.get(row.player1Id);
                  const p2 = playerMap.get(row.player2Id);
                  const pairName = `${p1?.name ?? `#${row.player1Id}`} & ${p2?.name ?? `#${row.player2Id}`}`;
                  const typeLabel = row.matchType === "mixed" ? "Mixed" : "Doppel";
                  return (
                    <div key={`${row.player1Id}-${row.player2Id}-${row.matchType}`} className="flex items-center gap-3">
                      <RankBadge rank={i + 1} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{pairName}</p>
                        <p className="text-xs text-muted-foreground">{typeLabel} · {row.wins} Siege</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{row.points} Pkt</p>
                        <p className="text-xs text-muted-foreground">{row.wins}S / {row.losses}N</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Letzte Spiele
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/matches")} className="text-muted-foreground text-xs">
                Alle ansehen →
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentMatches.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Noch keine Spiele erfasst.</p>
              ) : (
                recentMatches.map(m => {
                  const p1 = playerMap.get(m.player1Id);
                  const p2 = playerMap.get(m.player3Id);
                  const p1p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                  const p2p2 = m.player4Id ? playerMap.get(m.player4Id) : null;
                  const team1 = p1p2 ? `${p1?.name ?? "?"} & ${p1p2?.name ?? "?"}` : (p1?.name ?? "?");
                  const team2 = p2p2 ? `${p2?.name ?? "?"} & ${p2p2?.name ?? "?"}` : (p2?.name ?? "?");
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs shrink-0 border-border/50">
                        {matchTypeLabel[m.type]}
                      </Badge>
                      <span className={`truncate ${m.winningSide === 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>{team1}</span>
                      <span className="text-muted-foreground shrink-0">vs</span>
                      <span className={`truncate ${m.winningSide === 2 ? "text-primary font-medium" : "text-muted-foreground"}`}>{team2}</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  // Gold: #FFD700  Silber: #C0C0C0  Bronze: #CD7F32
  const colorStyle: Record<number, React.CSSProperties> = {
    1: { color: "#FFD700", borderColor: "rgba(255,215,0,0.4)", backgroundColor: "rgba(255,215,0,0.1)" },
    2: { color: "#C0C0C0", borderColor: "rgba(192,192,192,0.4)", backgroundColor: "rgba(192,192,192,0.1)" },
    3: { color: "#CD7F32", borderColor: "rgba(205,127,50,0.4)", backgroundColor: "rgba(205,127,50,0.1)" },
  };
  return (
    <div
      className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0"
      style={colorStyle[rank] ?? {}}
    >
      <Medal className="h-3.5 w-3.5" />
    </div>
  );
}
