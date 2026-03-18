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
import { Medal, Users2 } from "lucide-react";
import { useState } from "react";

export default function PairRanking() {
  const { data: seasons } = trpc.seasons.list.useQuery();
  const { data: players } = trpc.players.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");

  const seasonId = selectedSeasonId === "all" ? null : parseInt(selectedSeasonId);
  const typeFilter = matchTypeFilter === "all" ? undefined : (matchTypeFilter as "doubles");

  const { data: ranking, isLoading } = trpc.rankings.pairs.useQuery({ seasonId, matchType: typeFilter });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const ratio = (pf: number, pa: number) => pa === 0 ? (pf > 0 ? "∞" : "0.00") : (pf / pa).toFixed(2);

  const pairName = (p1Id: number, p2Id: number) => {
    const p1 = playerMap.get(p1Id)?.name ?? `#${p1Id}`;
    const p2 = playerMap.get(p2Id)?.name ?? `#${p2Id}`;
    return `${p1} & ${p2}`;
  };

  const typeLabel: Record<string, string> = { doubles: "Doppel" };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Paarungsrangliste
            </h1>
            <p className="text-muted-foreground mt-1">Erfolgreichste Doppel- und Mixed-Paarungen</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
              <SelectTrigger className="w-36 bg-input border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Modi</SelectItem>
                <SelectItem value="doubles">Doppel</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Berechne Rangliste…</div>
        ) : ranking?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Noch keine Doppel-/Mixed-Spiele in dieser Auswahl.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {(ranking?.length ?? 0) >= 3 && (
              <div className="flex items-end gap-3 mb-2">
                {[1, 0, 2].map((rankIdx) => {
                  const row = ranking![rankIdx];
                  if (!row) return null;
                  const podiumRank = rankIdx + 1;
                  const topOffset: Record<number, string> = { 1: "mt-0", 2: "mt-8", 3: "mt-16" };
                  const colors: Record<number, string> = {
                    1: "border-yellow-400/60 bg-yellow-400/8",
                    2: "border-slate-300/60 bg-slate-300/8",
                    3: "border-amber-700/60 bg-amber-700/8",
                  };
                  return (
                    <div key={`${row.player1Id}-${row.player2Id}-${row.matchType}`} className={`flex-1 ${topOffset[podiumRank]}`}>
                      <Card className={`border ${colors[podiumRank]} text-center h-full`}>
                        <CardContent className="pt-6 pb-4">
                          <RankMedal rank={podiumRank} />
                          <p className="font-semibold text-foreground mt-2 text-sm leading-tight">
                            {playerMap.get(row.player1Id)?.name ?? `#${row.player1Id}`}
                          </p>
                          <p className="font-semibold text-foreground text-sm leading-tight">
                            &amp; {playerMap.get(row.player2Id)?.name ?? `#${row.player2Id}`}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-xs border-border/40 text-blue-400 border-blue-500/20"
                          >
                            {typeLabel[row.matchType]}
                          </Badge>
                          <p className="text-2xl font-bold text-primary mt-2">{row.points}</p>
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
                  <Users2 className="h-4 w-4 text-primary" />
                  Paarungen ({ranking?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 items-center text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 px-2">
                  <span className="w-8 text-center">#</span>
                  <span>Paarung</span>
                  <span className="w-16 text-center">Modus</span>
                  <span className="w-12 text-center">Spiele</span>
                  <span className="w-10 text-center">S/N</span>
                  <span className="w-16 text-center">Punkte</span>
                  <span className="w-16 text-center">Ratio</span>
                </div>
                {/* Mobile Header */}
                <div className="sm:hidden grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 px-3">
                  <span className="w-7 text-center">#</span>
                  <span>Paarung</span>
                  <span className="text-center w-12">S/N</span>
                  <span className="text-center w-14">Punkte</span>
                </div>
                <div className="divide-y divide-border/20">
                  {ranking?.map((row, i) => {
                    const isTop3 = i < 3;
                    const name = pairName(row.player1Id, row.player2Id);
                    return (
                      <div key={`${row.player1Id}-${row.player2Id}-${row.matchType}`}>
                        {/* Desktop Row */}
                        <div className={`hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 items-center py-3 px-2 rounded-lg transition-colors hover:bg-muted/10 ${isTop3 ? "bg-primary/3" : ""}`}>
                          <RankNumber rank={i + 1} />
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isTop3 ? "text-foreground" : "text-foreground/80"}`}>
                              {name}
                            </p>
                          </div>
                          <Badge variant="outline" className="w-16 justify-center text-xs border-border/50 text-blue-400 border-blue-500/20">
                            {typeLabel[row.matchType]}
                          </Badge>
                          <span className="text-center w-12 text-sm text-muted-foreground">{row.gamesPlayed}</span>
                          <span className="text-center w-10 text-sm text-muted-foreground">{row.wins}/{row.losses}</span>
                          <span className={`text-center w-16 font-bold text-sm ${isTop3 ? "text-primary" : "text-foreground"}`}>{row.points}</span>
                          <span className="text-center w-16 text-xs text-muted-foreground">{ratio(row.pointsFor, row.pointsAgainst)}</span>
                        </div>
                        {/* Mobile Row */}
                        <div className={`sm:hidden grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center py-3 px-3 ${isTop3 ? "bg-primary/3" : ""}`}>
                          <RankNumber rank={i + 1} small />
                          <div className="min-w-0">
                            <p className={`font-medium text-sm truncate ${isTop3 ? "text-foreground" : "text-foreground/80"}`}>
                              {name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 border-border/40 text-blue-400 border-blue-500/20">
                                {typeLabel[row.matchType]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{row.gamesPlayed} Sp. · {ratio(row.pointsFor, row.pointsAgainst)}</span>
                            </div>
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
              Punkte: 3 pro Sieg, 1 pro Niederlage · Ratio = Punkte erzielt / Punkte kassiert
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
