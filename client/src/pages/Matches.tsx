import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ListOrdered, Pencil, PlusCircle, Trash2, Trophy, X } from "lucide-react";
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

interface SetScore { scoreTeam1: number; scoreTeam2: number; }

export default function Matches() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: seasons } = trpc.seasons.list.useQuery();
  const { data: activeSeason } = trpc.seasons.active.useQuery();
  const { data: players } = trpc.players.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() =>
    activeSeason ? String(activeSeason.id) : "all"
  );
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");

  // Edit dialog state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWinningSide, setEditWinningSide] = useState<number>(1);
  const [editSets, setEditSets] = useState<SetScore[]>([{ scoreTeam1: 0, scoreTeam2: 0 }]);
  const [editTeam1Label, setEditTeam1Label] = useState("");
  const [editTeam2Label, setEditTeam2Label] = useState("");

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

  const updateMutation = trpc.matches.update.useMutation({
    onSuccess: () => {
      utils.matches.listBySeason.invalidate();
      utils.matches.listAll.invalidate();
      utils.rankings.players.invalidate();
      utils.rankings.pairs.invalidate();
      setEditingId(null);
      toast.success("Spiel aktualisiert.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Load sets for editing
  const { data: matchDetail } = trpc.matches.getById.useQuery(
    { id: editingId! },
    { enabled: editingId !== null }
  );

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));

  const filteredMatches = (allMatches ?? []).filter(m =>
    matchTypeFilter === "all" || m.type === matchTypeFilter
  );

  const getTeamLabel = (p1Id: number, p2Id: number | null | undefined) => {
    const p1 = playerMap.get(p1Id)?.name ?? `#${p1Id}`;
    if (!p2Id) return p1;
    const p2 = playerMap.get(p2Id)?.name ?? `#${p2Id}`;
    return `${p1} & ${p2}`;
  };

  const formatDate = (d: number | Date | null | undefined) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  const handleDelete = (id: number) => {
    if (confirm("Spiel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEdit = (m: { id: number; winningSide: number; player1Id: number; player2Id?: number | null; player3Id: number; player4Id?: number | null }) => {
    setEditingId(m.id);
    setEditWinningSide(m.winningSide);
    setEditTeam1Label(getTeamLabel(m.player1Id, m.player2Id));
    setEditTeam2Label(getTeamLabel(m.player3Id, m.player4Id));
    // Sets werden über matchDetail geladen
    setEditSets([{ scoreTeam1: 0, scoreTeam2: 0 }]);
  };

  // Sobald matchDetail geladen ist, Sätze übernehmen
  const currentSets = matchDetail?.id === editingId && matchDetail.sets?.length > 0
    ? matchDetail.sets.map(s => ({ scoreTeam1: s.scoreTeam1, scoreTeam2: s.scoreTeam2 }))
    : editSets;

  const handleSaveEdit = () => {
    if (!editingId) return;
    const setsToSave = matchDetail?.id === editingId ? currentSets : editSets;
    updateMutation.mutate({
      id: editingId,
      winningSide: editWinningSide,
      sets: setsToSave,
    });
  };

  const updateSet = (idx: number, field: keyof SetScore, value: number) => {
    const updated = currentSets.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setEditSets(updated);
    // Patch matchDetail cache locally
  };

  const addSet = () => setEditSets([...currentSets, { scoreTeam1: 0, scoreTeam2: 0 }]);
  const removeSet = (idx: number) => {
    if (currentSets.length <= 1) return;
    setEditSets(currentSets.filter((_, i) => i !== idx));
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
            {isAdmin && (
              <Button onClick={() => setLocation("/matches/new")} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Spiel erfassen
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Lade Spiele…</div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ListOrdered className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Keine Spiele gefunden.</p>
            {isAdmin && (
              <Button onClick={() => setLocation("/matches/new")} variant="outline" className="mt-4 gap-2">
                <PlusCircle className="h-4 w-4" />
                Erstes Spiel erfassen
              </Button>
            )}
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
                  const team1 = getTeamLabel(m.player1Id, m.player2Id);
                  const team2 = getTeamLabel(m.player3Id, m.player4Id);
                  const team1Won = m.winningSide === 1;
                  const team2Won = m.winningSide === 2;
                  return (
                    <div key={m.id} className="py-3 flex items-center gap-3 hover:bg-muted/5 rounded-lg px-2 transition-colors">
                      <Badge variant="outline" className={`text-xs shrink-0 ${matchTypeBadge[m.type]}`}>
                        {matchTypeLabel[m.type]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm truncate max-w-[200px] ${team1Won ? "text-primary" : "text-foreground/70"}`}>
                            {team1Won && <Trophy className="inline h-3 w-3 mr-1 text-primary" />}
                            {team1}
                          </span>
                          <span className="text-muted-foreground text-sm shrink-0 font-bold">vs</span>
                          <span className={`font-medium text-sm truncate max-w-[200px] ${team2Won ? "text-primary" : "text-foreground/70"}`}>
                            {team2Won && <Trophy className="inline h-3 w-3 mr-1 text-primary" />}
                            {team2}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(m.playedAt)}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(m.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bearbeiten-Dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              Spiel bearbeiten
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Sieger */}
            <div className="space-y-2">
              <Label>Sieger</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditWinningSide(1)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                    editWinningSide === 1
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <Trophy className="inline h-3.5 w-3.5 mr-1.5" />
                  {editTeam1Label || "Team 1"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditWinningSide(2)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                    editWinningSide === 2
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <Trophy className="inline h-3.5 w-3.5 mr-1.5" />
                  {editTeam2Label || "Team 2"}
                </button>
              </div>
            </div>

            {/* Sätze */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sätze</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSet} className="h-7 text-xs gap-1">
                  <PlusCircle className="h-3 w-3" /> Satz hinzufügen
                </Button>
              </div>
              <div className="space-y-2">
                {currentSets.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">Satz {idx + 1}</span>
                    <Input
                      type="number"
                      min={0}
                      value={s.scoreTeam1}
                      onChange={e => updateSet(idx, "scoreTeam1", parseInt(e.target.value) || 0)}
                      className="w-16 text-center bg-input border-border/50 h-8"
                    />
                    <span className="text-muted-foreground font-bold text-sm">:</span>
                    <Input
                      type="number"
                      min={0}
                      value={s.scoreTeam2}
                      onChange={e => updateSet(idx, "scoreTeam2", parseInt(e.target.value) || 0)}
                      className="w-16 text-center bg-input border-border/50 h-8"
                    />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {editTeam1Label} : {editTeam2Label}
                    </span>
                    {currentSets.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSet(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Abbrechen</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
