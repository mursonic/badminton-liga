import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ListOrdered, PlusCircle, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const matchTypeLabel: Record<string, string> = {
  singles: "Einzel",
  doubles: "Doppel",
  mixed: "Mixed",
};

const matchTypeBadge: Record<string, string> = {
  singles: "text-blue-400 border-blue-500/20",
  doubles: "text-green-400 border-green-500/20",
  mixed: "text-purple-400 border-purple-500/20",
};

export default function Matches() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: seasons } = trpc.seasons.list.useQuery();
  const { data: activeSeason } = trpc.seasons.active.useQuery();
  const { data: players } = trpc.players.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() =>
    activeSeason ? String(activeSeason.id) : "all"
  );
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");

  const seasonId = selectedSeasonId === "all" ? null : parseInt(selectedSeasonId);

  const { data: allMatches, isLoading } = seasonId
    ? trpc.matches.listBySeason.useQuery({ seasonId })
    : trpc.matches.listAll.useQuery();

  const deleteMutation = trpc.matches.delete.useMutation({
    onSuccess: () => {
      utils.matches.listBySeason.invalidate();
      utils.matches.listAll.invalidate();
      utils.rankings.players.invalidate();
      utils.rankings.pairs.invalidate();
      toast.success("Spiel gelöscht.");
    },
    onError: (e) => toast.error(e.message),
  });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const filteredMatches = (allMatches ?? []).filter(m =>
    matchTypeFilter === "all" || m.matchType === matchTypeFilter
  );

  const getTeamLabel = (p1Id: number, p2Id: number | null | undefined) => {
    const p1 = playerMap.get(p1Id)?.name ?? `#${p1Id}`;
    if (!p2Id) return p1;
    const p2 = playerMap.get(p2Id)?.name ?? `#${p2Id}`;
    return `${p1} & ${p2}`;
  };

  const formatDate = (d: Date) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const handleDelete = (id: number) => {
    if (confirm("Spiel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Alle Spiele
            </h1>
            <p className="text-muted-foreground mt-1">{filteredMatches.length} Spiele gefunden</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
              <SelectTrigger className="w-36 bg-input border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Modi</SelectItem>
                <SelectItem value="singles">Einzel</SelectItem>
                <SelectItem value="doubles">Doppel</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="w-44 bg-input border-border/50">
                <SelectValue placeholder="Saison" />
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
            <Button onClick={() => setLocation("/matches/new")} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Spiel erfassen
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Lade Spiele…</div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ListOrdered className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Keine Spiele gefunden.</p>
            <Button onClick={() => setLocation("/matches/new")} variant="outline" className="mt-4 gap-2">
              <PlusCircle className="h-4 w-4" />
              Erstes Spiel erfassen
            </Button>
          </div>
        ) : (
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                Spielübersicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/20">
                {filteredMatches.map(m => {
                  const team1 = getTeamLabel(m.team1Player1Id, m.team1Player2Id);
                  const team2 = getTeamLabel(m.team2Player1Id, m.team2Player2Id);
                  return (
                    <div key={m.id} className="py-3 flex items-center gap-3 hover:bg-muted/5 rounded-lg px-2 transition-colors">
                      <Badge variant="outline" className={`text-xs shrink-0 ${matchTypeBadge[m.matchType]}`}>
                        {matchTypeLabel[m.matchType]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm truncate max-w-[200px] ${m.winner === "team1" ? "text-primary" : "text-foreground/70"}`}>
                            {m.winner === "team1" && <Trophy className="inline h-3 w-3 mr-1 text-primary" />}
                            {team1}
                          </span>
                          <span className="text-muted-foreground text-sm shrink-0 font-bold">
                            {m.team1Sets} : {m.team2Sets}
                          </span>
                          <span className={`font-medium text-sm truncate max-w-[200px] ${m.winner === "team2" ? "text-primary" : "text-foreground/70"}`}>
                            {m.winner === "team2" && <Trophy className="inline h-3 w-3 mr-1 text-primary" />}
                            {team2}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(m.playedAt)} · {m.team1TotalPoints}:{m.team2TotalPoints} Punkte gesamt
                          {m.notes && ` · ${m.notes}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDelete(m.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
