import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart3, Crown, Medal, Swords, TrendingUp, Users2 } from "lucide-react";

export default function Statistics() {
  const { data: players } = trpc.players.list.useQuery();
  const { data: overallStats } = trpc.stats.overallPlayers.useQuery();
  const { data: allMatches } = trpc.matches.listAll.useQuery();
  const { data: allPairRanking } = trpc.rankings.pairs.useQuery({ seasonId: null });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const top5Players = overallStats?.slice(0, 5) ?? [];
  const top5Pairs = allPairRanking?.slice(0, 5) ?? [];

  const totalMatches = allMatches?.length ?? 0;
  const singlesCount = allMatches?.filter(m => m.type === "singles").length ?? 0;
  const doublesCount = allMatches?.filter(m => m.type === "doubles").length ?? 0;
  const mixedCount = allMatches?.filter(m => m.type === "mixed").length ?? 0;

  // Most active player (most games played)
  const mostActive = overallStats?.slice().sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];
  // Best win rate (min 3 games)
  const bestWinRate = overallStats
    ?.filter(p => p.gamesPlayed >= 3)
    .slice()
    .sort((a, b) => (b.wins / b.gamesPlayed) - (a.wins / a.gamesPlayed))[0];

  const pairName = (p1Id: number, p2Id: number) => {
    const p1 = playerMap.get(p1Id)?.name ?? `#${p1Id}`;
    const p2 = playerMap.get(p2Id)?.name ?? `#${p2Id}`;
    return `${p1} & ${p2}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Statistiken
          </h1>
          <p className="text-muted-foreground mt-1">Gesamtauswertung über alle Saisons</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Swords className="h-5 w-5 text-primary" />} label="Spiele gesamt" value={totalMatches} />
          <StatCard icon={<BarChart3 className="h-5 w-5 text-blue-400" />} label="Einzel" value={singlesCount} />
          <StatCard icon={<Users2 className="h-5 w-5 text-green-400" />} label="Doppel" value={doublesCount} />
          <StatCard icon={<Users2 className="h-5 w-5 text-purple-400" />} label="Mixed" value={mixedCount} />
        </div>

        {/* Highlights */}
        {(mostActive || bestWinRate) && (
          <div className="grid md:grid-cols-2 gap-4">
            {mostActive && (
              <Card className="bg-card border-border/50 border-primary/20">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Aktivster Spieler</p>
                      <p className="font-semibold text-foreground text-lg">{playerMap.get(mostActive.playerId)?.name ?? `#${mostActive.playerId}`}</p>
                      <p className="text-sm text-muted-foreground">{mostActive.gamesPlayed} Spiele · {mostActive.wins} Siege</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {bestWinRate && (
              <Card className="bg-card border-border/50 border-yellow-500/20">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Crown className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Beste Gewinnquote</p>
                      <p className="font-semibold text-foreground text-lg">{playerMap.get(bestWinRate.playerId)?.name ?? `#${bestWinRate.playerId}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((bestWinRate.wins / bestWinRate.gamesPlayed) * 100)}% Siege ({bestWinRate.wins}/{bestWinRate.gamesPlayed})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Players All-Time */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Medal className="h-4 w-4 text-primary" />
                Top Spieler (Gesamt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5Players.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Keine Daten vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {top5Players.map((row, i) => {
                    const player = playerMap.get(row.playerId);
                    const winRate = row.gamesPlayed > 0 ? Math.round((row.wins / row.gamesPlayed) * 100) : 0;
                    return (
                      <div key={row.playerId} className="flex items-center gap-3">
                        <RankNumber rank={i + 1} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{player?.name ?? `#${row.playerId}`}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${winRate}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{winRate}%</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary text-sm">{row.points} Pkt</p>
                          <p className="text-xs text-muted-foreground">{row.gamesPlayed} Spiele</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Pairs All-Time */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Top Paarungen (Gesamt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5Pairs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Keine Daten vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {top5Pairs.map((row, i) => {
                    const winRate = row.gamesPlayed > 0 ? Math.round((row.wins / row.gamesPlayed) * 100) : 0;
                    return (
                      <div key={`${row.player1Id}-${row.player2Id}-${row.matchType}`} className="flex items-center gap-3">
                        <RankNumber rank={i + 1} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground truncate text-sm">{pairName(row.player1Id, row.player2Id)}</p>
                            <Badge variant="outline" className={`text-xs shrink-0 ${row.matchType === "mixed" ? "text-purple-400 border-purple-500/20" : "text-green-400 border-green-500/20"}`}>
                              {row.matchType === "mixed" ? "Mixed" : "Doppel"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${winRate}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{winRate}%</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary text-sm">{row.points} Pkt</p>
                          <p className="text-xs text-muted-foreground">{row.gamesPlayed} Spiele</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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

function RankNumber({ rank }: { rank: number }) {
  if (rank <= 3) {
    const styles = {
      1: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      2: "bg-slate-400/20 text-slate-300 border-slate-400/30",
      3: "bg-orange-700/20 text-orange-400 border-orange-700/30",
    };
    return (
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${styles[rank as keyof typeof styles]}`}>
        {rank}
      </div>
    );
  }
  return <span className="w-8 text-center text-sm text-muted-foreground font-medium">{rank}</span>;
}
