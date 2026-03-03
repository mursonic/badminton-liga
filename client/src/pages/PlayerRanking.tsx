import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Medal, Trophy } from "lucide-react";
import { useState } from "react";

export default function PlayerRanking() {
  const { data: seasons } = trpc.seasons.list.useQuery();
  const { data: activeSeason } = trpc.seasons.active.useQuery();
  const { data: players } = trpc.players.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");

  const seasonId = selectedSeasonId === "all" ? null : parseInt(selectedSeasonId);
  const { data: ranking, isLoading } = trpc.rankings.players.useQuery({ seasonId });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const ratio = (pf: number, pa: number) => pa === 0 ? (pf > 0 ? "∞" : "0.00") : (pf / pa).toFixed(2);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Einzelrangliste
            </h1>
            <p className="text-muted-foreground mt-1">Punktestand aller Spieler im Einzelmodus</p>
          </div>
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-44 bg-input border-border/50">
              <SelectValue placeholder="Saison wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Saisons</SelectItem>
              {seasons?.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name} {s.isActive ? "★" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Berechne Rangliste…</div>
        ) : ranking?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Noch keine Einzelspiele in dieser Saison.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {(ranking?.length ?? 0) >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[1, 0, 2].map((rankIdx) => {
                  const row = ranking![rankIdx];
                  if (!row) return null;
                  const player = playerMap.get(row.playerId);
                  const rank = rankIdx + 1;
                  const podiumRank = rankIdx === 0 ? 2 : rankIdx === 1 ? 1 : 3;
                  const heights = { 1: "pt-8", 2: "pt-4", 3: "pt-12" };
                  const colors = {
                    1: "border-yellow-500/40 bg-yellow-500/5",
                    2: "border-slate-400/40 bg-slate-400/5",
                    3: "border-orange-700/40 bg-orange-700/5",
                  };
                  return (
                    <Card key={row.playerId} className={`border ${colors[podiumRank as keyof typeof colors]} ${heights[podiumRank as keyof typeof heights]} text-center`}>
                      <CardContent className="pt-4 pb-4">
                        <RankMedal rank={podiumRank} />
                        <p className="font-semibold text-foreground mt-2 truncate">{player?.name ?? `#${row.playerId}`}</p>
                        <p className="text-2xl font-bold text-primary mt-1">{row.points}</p>
                        <p className="text-xs text-muted-foreground">Punkte</p>
                        <p className="text-xs text-muted-foreground mt-1">{row.wins}S / {row.losses}N</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full Table */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Vollständige Rangliste
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Table Header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 gap-y-0 items-center text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 px-2">
                  <span className="w-8 text-center">#</span>
                  <span>Spieler</span>
                  <span className="text-center w-12">Spiele</span>
                  <span className="text-center w-10">S/N</span>
                  <span className="text-center w-16">Punkte</span>
                  <span className="text-center w-16">Ratio</span>
                </div>
                <div className="divide-y divide-border/20">
                  {ranking?.map((row, i) => {
                    const player = playerMap.get(row.playerId);
                    const isTop3 = i < 3;
                    return (
                      <div key={row.playerId} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center py-3 px-2 rounded-lg transition-colors hover:bg-muted/10 ${isTop3 ? "bg-primary/3" : ""}`}>
                        <RankNumber rank={i + 1} />
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isTop3 ? "text-foreground" : "text-foreground/80"}`}>
                            {player?.name ?? `Spieler #${row.playerId}`}
                          </p>

                        </div>
                        <span className="text-center w-12 text-sm text-muted-foreground">{row.gamesPlayed}</span>
                        <span className="text-center w-10 text-sm text-muted-foreground">{row.wins}/{row.losses}</span>
                        <span className={`text-center w-16 font-bold text-sm ${isTop3 ? "text-primary" : "text-foreground"}`}>{row.points}</span>
                        <span className="text-center w-16 text-xs text-muted-foreground">{ratio(row.pointsFor, row.pointsAgainst)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>S = Siege · N = Niederlagen · Punkte: 3 pro Sieg, 1 pro Niederlage · Ratio = Punkte erzielt / Punkte kassiert</span>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const colors = { 1: "text-yellow-400", 2: "text-slate-300", 3: "text-orange-400" };
  return <Medal className={`h-8 w-8 mx-auto ${colors[rank as keyof typeof colors] ?? "text-muted-foreground"}`} />;
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
