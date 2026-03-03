import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Trophy, Users, Swords, CalendarDays, PlusCircle, TrendingUp, Medal } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: activeSeason } = trpc.seasons.active.useQuery();
  const { data: players } = trpc.players.listActive.useQuery();
  const { data: ranking } = trpc.rankings.players.useQuery({ seasonId: activeSeason?.id ?? null });
  const { data: matches } = trpc.matches.listBySeason.useQuery(
    { seasonId: activeSeason?.id ?? 0 },
    { enabled: !!activeSeason?.id }
  );

  const top3 = ranking?.slice(0, 3) ?? [];
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
          <Button onClick={() => setLocation("/matches/new")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Spiel erfassen
          </Button>
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
            label="Spiele diese Saison"
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
          {/* Top 3 Ranking */}
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
                <p className="text-muted-foreground text-sm text-center py-4">Noch keine Spiele erfasst.</p>
              ) : (
                top3.map((row, i) => {
                  const player = playerMap.get(row.playerId);
                  return (
                    <div key={row.playerId} className="flex items-center gap-3">
                      <RankBadge rank={i + 1} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{player?.name ?? `Spieler #${row.playerId}`}</p>
                        <p className="text-xs text-muted-foreground">{row.gamesPlayed} Spiele</p>
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
  const styles: Record<number, string> = {
    1: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    2: "bg-slate-400/20 text-slate-300 border-slate-400/30",
    3: "bg-orange-700/20 text-orange-400 border-orange-700/30",
  };
  const icons: Record<number, React.ReactNode> = {
    1: <Medal className="h-3 w-3" />,
    2: <Medal className="h-3 w-3" />,
    3: <Medal className="h-3 w-3" />,
  };
  return (
    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${styles[rank] ?? "bg-muted text-muted-foreground border-border"}`}>
      {icons[rank] ?? rank}
    </div>
  );
}
