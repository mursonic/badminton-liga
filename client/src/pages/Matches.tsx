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
import { AlertCircle, ListOrdered, Minus, Plus, PlusCircle, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const matchTypeLabel: Record<string, string> = {
  singles: "Einzel",
  doubles: "Doppel",

};

const matchTypeBadge: Record<string, string> = {
  singles: "text-blue-400 border-blue-500/20",
  doubles: "text-green-400 border-green-500/20",

};

interface SetScore { scoreTeam1: number; scoreTeam2: number; }

// ─── Badminton-Validierung ────────────────────────────────────────────────────
function validateBadmintonSet(s1: number, s2: number): string | null {
  if (s1 === s2) return "Unentschieden nicht möglich.";
  const winner = Math.max(s1, s2);
  const loser = Math.min(s1, s2);
  if (winner < 21) return `Sieger braucht mind. 21 Punkte (aktuell: ${winner}).`;
  if (winner > 30) return `Maximum ist 30 Punkte (aktuell: ${winner}).`;
  if (loser > 29) return `Verlierer max. 29 Punkte (aktuell: ${loser}).`;
  if (winner === 21 && loser >= 20) return `Bei 21:${loser} fehlt der 2-Punkte-Vorsprung (z.B. 22:20).`;
  if (winner >= 22 && winner <= 29 && winner - loser !== 2) return `Vorsprung muss genau 2 Punkte betragen.`;
  if (winner === 30 && loser !== 29) return `Bei 30 Punkten muss der Verlierer 29 haben.`;
  return null;
}

function validateSets(sets: SetScore[], winningSide: number): string | null {
  if (sets.length === 0) return "Mindestens ein Satz erforderlich.";
  if (sets.length > 3) return "Maximal 3 Sätze möglich.";
  for (let i = 0; i < sets.length; i++) {
    const err = validateBadmintonSet(sets[i].scoreTeam1, sets[i].scoreTeam2);
    if (err) return `Satz ${i + 1}: ${err}`;
  }
  const t1Sets = sets.filter(s => s.scoreTeam1 > s.scoreTeam2).length;
  const t2Sets = sets.filter(s => s.scoreTeam2 > s.scoreTeam1).length;
  if (sets.length === 1) {
    const sw = sets[0].scoreTeam1 > sets[0].scoreTeam2 ? 1 : 2;
    if (sw !== winningSide) return "Gewinner hat den Satz nicht gewonnen.";
  } else if (sets.length === 2) {
    if (t1Sets !== 2 && t2Sets !== 2) return "Bei 2 Sätzen muss ein Team beide gewonnen haben (2:0).";
    if ((t1Sets === 2 ? 1 : 2) !== winningSide) return "Gewinner hat nicht beide Sätze gewonnen.";
  } else {
    if (t1Sets !== 2 && t2Sets !== 2) return "Bei 3 Sätzen muss ein Team 2 Sätze gewonnen haben (2:1).";
    if ((t1Sets === 2 ? 1 : 2) !== winningSide) return "Gewinner hat nicht 2 von 3 Sätzen gewonnen.";
  }
  return null;
}

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
  const [editSets, setEditSets] = useState<SetScore[]>([{ scoreTeam1: 21, scoreTeam2: 0 }]);
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

  // Sync sets from matchDetail when loaded
  useEffect(() => {
    if (matchDetail?.id === editingId && matchDetail.sets?.length > 0) {
      setEditSets(matchDetail.sets.map(s => ({ scoreTeam1: s.scoreTeam1, scoreTeam2: s.scoreTeam2 })));
    }
  }, [matchDetail?.id, editingId]);

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

  const formatDate = (d: number | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

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
    setEditSets([{ scoreTeam1: 21, scoreTeam2: 0 }]); // Placeholder bis matchDetail geladen
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const validationError = validateSets(editSets, editWinningSide);
    if (validationError) { toast.error(validationError); return; }
    updateMutation.mutate({ id: editingId, winningSide: editWinningSide, sets: editSets });
  };

  const updateSet = (idx: number, field: keyof SetScore, value: number) => {
    setEditSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: Math.max(0, Math.min(30, value)) } : s));
  };

  const addEditSet = () => {
    if (editSets.length >= 3) { toast.error("Maximal 3 Sätze möglich."); return; }
    setEditSets(prev => [...prev, { scoreTeam1: 21, scoreTeam2: 0 }]);
  };
  const removeEditSet = (idx: number) => {
    if (editSets.length <= 1) return;
    setEditSets(prev => prev.filter((_, i) => i !== idx));
  };

  // Live-Validierung
  const setErrors = editSets.map(s => validateBadmintonSet(s.scoreTeam1, s.scoreTeam2));
  const overallError = validateSets(editSets, editWinningSide);

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
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5 text-xs"
                            onClick={() => openEdit(m)}
                          >
                            Bearbeiten
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
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
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
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left ${
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEditSet}
                  disabled={editSets.length >= 3}
                  className="h-7 text-xs gap-1 border-dashed"
                >
                  <Plus className="h-3 w-3" /> Satz hinzufügen
                </Button>
              </div>

              {/* Spaltenheader */}
              <div className="grid grid-cols-[3rem_1fr_auto_1fr_2rem] gap-2 items-center text-xs text-muted-foreground px-1">
                <span></span>
                <span className="truncate text-center">{editTeam1Label || "Team 1"}</span>
                <span className="w-4 text-center"></span>
                <span className="truncate text-center">{editTeam2Label || "Team 2"}</span>
                <span></span>
              </div>

              <div className="space-y-2">
                {editSets.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="grid grid-cols-[3rem_1fr_auto_1fr_2rem] gap-2 items-center">
                      <span className="text-xs text-muted-foreground text-center">Satz {idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateSet(idx, "scoreTeam1", s.scoreTeam1 - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={s.scoreTeam1}
                          onChange={e => updateSet(idx, "scoreTeam1", parseInt(e.target.value) || 0)}
                          className="text-center bg-input border-border/50 h-8 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => updateSet(idx, "scoreTeam1", s.scoreTeam1 + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <span className="text-muted-foreground font-bold text-sm text-center w-4">:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateSet(idx, "scoreTeam2", s.scoreTeam2 - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={s.scoreTeam2}
                          onChange={e => updateSet(idx, "scoreTeam2", parseInt(e.target.value) || 0)}
                          className="text-center bg-input border-border/50 h-8 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => updateSet(idx, "scoreTeam2", s.scoreTeam2 + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      {editSets.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeEditSet(idx)}
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : <span />}
                    </div>
                    {setErrors[idx] && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 pl-14">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{setErrors[idx]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gesamt-Validierungsfehler */}
            {overallError && !setErrors.some(Boolean) && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{overallError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Abbrechen</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !!overallError}
            >
              {updateMutation.isPending ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
