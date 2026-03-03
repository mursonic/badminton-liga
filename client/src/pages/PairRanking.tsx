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
import { Users2 } from "lucide-react";
import { useState } from "react";

export default function PairRanking() {
  const { data: seasons } = trpc.seasons.list.useQuery();
  const { data: players } = trpc.players.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");

  const seasonId = selectedSeasonId === "all" ? null : parseInt(selectedSeasonId);
  const typeFilter = matchTypeFilter === "all" ? undefined : (matchTypeFilter as "doubles" | "mixed");

  const { data: ranking, isLoading } = trpc.rankings.pairs.useQuery({ seasonId, matchType: typeFilter });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const ratio = (pf: number, pa: number) => pa === 0 ? (pf > 0 ? "∞" : "0.00") : (pf / pa).toFixed(2);

  const pairName = (p1Id: number, p2Id: number) => {
    const p1 = playerMap.get(p1Id)?.name ?? `#${p1Id}`;
    const p2 = playerMap.get(p2Id)?.name ?? `#${p2Id}`;
    return `${p1} & ${p2}`;
  };

  const typeLabel = { doubles: "Doppel", mixed: "Mixed" };

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
          <div className="flex gap-2">
            <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
              <SelectTrigger className="w-36 bg-input border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Modi</SelectItem>
                <SelectItem value="doubles">Doppel</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
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
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                Paarungen ({ranking?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 gap-y-0 items-center text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30 px-2">
                <span className="w-8 text-center">#</span>
                <span>Paarung</span>
                <span className="w-16 text-center">Modus</span>
                <span className="w-12 text-center">Spiele</span>
                <span className="w-10 text-center">S/N</span>
                <span className="w-16 text-center">Punkte</span>
                <span className="w-16 text-center">Ratio</span>
              </div>
              <div className="divide-y divide-border/20">
                {ranking?.map((row, i) => {
                  const isTop3 = i < 3;
                  return (
                    <div key={`${row.player1Id}-${row.player2Id}-${row.matchType}`} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 items-center py-3 px-2 rounded-lg transition-colors hover:bg-muted/10 ${isTop3 ? "bg-primary/3" : ""}`}>
                      <RankNumber rank={i + 1} />
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${isTop3 ? "text-foreground" : "text-foreground/80"}`}>
                          {pairName(row.player1Id, row.player2Id)}
                        </p>
                      </div>
                      <Badge variant="outline" className={`w-16 justify-center text-xs border-border/50 ${row.matchType === "mixed" ? "text-purple-400 border-purple-500/20" : "text-blue-400 border-blue-500/20"}`}>
                        {typeLabel[row.matchType]}
                      </Badge>
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
        )}

        <div className="text-xs text-muted-foreground">
          Punkte: 3 pro Sieg, 1 pro Niederlage · Ratio = Punkte erzielt / Punkte kassiert
        </div>
      </div>
    </DashboardLayout>
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
