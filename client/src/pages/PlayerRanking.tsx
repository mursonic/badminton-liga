import DashboardLayout from "@/components/DashboardLayout";
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
import { useLocation } from "wouter";

export default function PlayerRanking() {
  const [, setLocation] = useLocation();
  const { data: seasons } = trpc.seasons.list.useQuery();
  const { data: players } = trpc.players.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");

  const seasonId = selectedSeasonId === "all" ? null : parseInt(selectedSeasonId);
  const { data: ranking, isLoading } = trpc.rankings.players.useQuery({ seasonId });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const ratio = (pf: number, pa: number) => pa === 0 ? (pf > 0 ? "∞" : "0.00") : (pf / pa).toFixed(2);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
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
              <div className="flex items-end gap-3 mb-2">
                {[1, 0, 2].map((rankIdx) => {
                  const row = ranking![rankIdx];
                  if (!row) return null;
                  const player = playerMap.get(row.playerId);
                  const podiumRank = rankIdx + 1;
                  const topOffset: Record<number, string> = { 1: "mt-0", 2: "mt-8", 3: "mt-16" };
                  const colors: Record<number, string> = {
                    1: "border-yellow-400/60 bg-yellow-400/8",
                    2: "border-slate-300/60 bg-slate-300/8",
                    3: "border-amber-700/60 bg-amber-700/8",
                  };
                  return (
                    <div key={row.playerId} className={`flex-1 ${topOffset[podiumRank]}`}>
                      <Card className={`border ${colors[podiumRank]} text-center h-full`}>
                        <CardContent className="pt-6 pb-4">
                          <RankMedal rank={podiumRank} />
                          <button
                            onClick={() => setLocation(`/players/${row.playerId}`)}
                            className="font-semibold text-foreground mt-2 truncate block w-full hover:text-primary transition-colors"
                          >
                            {player?.name ?? `#${row.playerId}`}
                          </button>
                          <p className="text-2xl font-bold text-primary mt-1">{row.points}</p>
                          <p className="text-xs text-muted-foreground">Punkte</p>
                          <p className="text-xs text-muted-foreground mt-1">{row.wins}S / {row.losses}N</p>
                        </CardContent>
                      </Card>
                    </div>
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
              <CardContent className="px-0 sm:px-6">
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 px-2">
                  <span className="w-8 text-center">#</span>
                  <span>Spieler</span>
                  <span className="text-center w-12">Spiele</span>
                  <span className="text-center w-10">S/N</span>
                  <span className="text-center w-16">Punkte</span>
                  <span className="text-center w-16">Ratio</span>
                </div>
                {/* Mobile Header */}
                <div className="sm:hidden grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 px-3">
                  <span className="w-7 text-center">#</span>
                  <span>Spieler</span>
                  <span className="text-center w-12">S/N</span>
                  <span className="text-center w-14">Punkte</span>
                </div>
                <div className="divide-y divide-border/20">
                  {ranking?.map((row, i) => {
                    const player = playerMap.get(row.playerId);
                    const isTop3 = i < 3;
                    return (
                      <div key={row.playerId}>
                        {/* Desktop Row */}
                        <div className={`hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center py-3 px-2 rounded-lg transition-colors hover:bg-muted/10 ${isTop3 ? "bg-primary/3" : ""}`}>
                          <RankNumber rank={i + 1} />
                          <div className="min-w-0">
                            <button
                              onClick={() => setLocation(`/players/${row.playerId}`)}
                              className={`font-medium truncate text-left hover:text-primary transition-colors w-full ${isTop3 ? "text-foreground" : "text-foreground/80"}`}
                            >
                              {player?.name ?? `Spieler #${row.playerId}`}
                            </button>
                          </div>
                          <span className="text-center w-12 text-sm text-muted-foreground">{row.gamesPlayed}</span>
                          <span className="text-center w-10 text-sm text-muted-foreground">{row.wins}/{row.losses}</span>
                          <span className={`text-center w-16 font-bold text-sm ${isTop3 ? "text-primary" : "text-foreground"}`}>{row.points}</span>
                          <span className="text-center w-16 text-xs text-muted-foreground">{ratio(row.pointsFor, row.pointsAgainst)}</span>
                        </div>
                        {/* Mobile Row */}
                        <div
                          className={`sm:hidden grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center py-3 px-3 transition-colors active:bg-muted/20 cursor-pointer ${isTop3 ? "bg-primary/3" : ""}`}
                          onClick={() => setLocation(`/players/${row.playerId}`)}
                        >
                          <RankNumber rank={i + 1} small />
                          <div className="min-w-0">
                            <p className={`font-medium text-sm truncate ${isTop3 ? "text-foreground" : "text-foreground/80"}`}>
                              {player?.name ?? `Spieler #${row.playerId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{row.gamesPlayed} Spiele · Ratio {ratio(row.pointsFor, row.pointsAgainst)}</p>
                          </div>
                          <span className="text-center w-12 text-xs text-muted-foreground">{row.wins}/{row.losses}</span>
                          <span className={`text-center w-14 font-bold text-sm ${isTop3 ? "text-primary" : "text-foreground"}`}>{row.points}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="text-xs text-muted-foreground">
              S = Siege · N = Niederlagen · Punkte: 3 pro Sieg, 1 pro Niederlage · Ratio = Punkte erzielt / Punkte kassiert · Klick auf Namen öffnet Spielerprofil
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const styles: Record<number, React.CSSProperties> = {
    1: { color: "#FFD700" },
    2: { color: "#C0C0C0" },
    3: { color: "#CD7F32" },
  };
  return <Medal className="h-8 w-8 mx-auto" style={styles[rank] ?? {}} />;
}

function RankNumber({ rank, small }: { rank: number; small?: boolean }) {
  const size = small ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs";
  if (rank <= 3) {
    const colorStyle: Record<number, React.CSSProperties> = {
      1: { color: "#FFD700", borderColor: "rgba(255,215,0,0.4)", backgroundColor: "rgba(255,215,0,0.1)" },
      2: { color: "#C0C0C0", borderColor: "rgba(192,192,192,0.4)", backgroundColor: "rgba(192,192,192,0.1)" },
      3: { color: "#CD7F32", borderColor: "rgba(205,127,50,0.4)", backgroundColor: "rgba(205,127,50,0.1)" },
    };
    return (
      <div
        className={`${size} rounded-full border flex items-center justify-center font-bold shrink-0`}
        style={colorStyle[rank]}
      >
        {rank}
      </div>
    );
  }
  return <span className={`${small ? "w-7" : "w-8"} text-center text-sm text-muted-foreground font-medium shrink-0`}>{rank}</span>;
}
