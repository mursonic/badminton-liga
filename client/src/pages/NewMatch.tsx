import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Minus, Plus, Swords } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type MatchType = "singles" | "doubles" | "mixed";

interface SetScore {
  scoreTeam1: number;
  scoreTeam2: number;
}

// ─── Badminton-Validierung ────────────────────────────────────────────────────
// Gültige Satzergebnisse im Badminton:
// - Normaler Satz: Sieger hat 21 Punkte, Vorsprung mind. 2 Punkte (z.B. 21:18, 21:19)
// - Einstand ab 20:20: Sieger hat mind. 22 Punkte, Vorsprung 2 Punkte (z.B. 22:20, 25:23)
// - Maximalpunkt: 30 Punkte (30:29 ist das Maximum)
// - Verlierer hat max. 29 Punkte
// - Mindestpunkte Verlierer: 0 (kein Minimum)

function validateBadmintonSet(s1: number, s2: number): string | null {
  if (s1 === s2) return "Unentschieden ist im Badminton nicht möglich.";
  const winner = s1 > s2 ? s1 : s2;
  const loser = s1 > s2 ? s2 : s1;

  if (winner < 21) return `Zu wenig Punkte – der Sieger braucht mind. 21 Punkte (aktuell: ${winner}).`;
  if (winner > 30) return `Zu viele Punkte – Maximum ist 30 (aktuell: ${winner}).`;
  if (loser > 29) return `Verlierer kann max. 29 Punkte haben (aktuell: ${loser}).`;

  // Bei 21 Punkten: Vorsprung mind. 2
  if (winner === 21 && loser >= 20) {
    return `Bei 21:${loser} fehlt der 2-Punkte-Vorsprung. Gültig wäre z.B. 22:20.`;
  }
  // Bei 22–29 Punkten: Vorsprung genau 2
  if (winner >= 22 && winner <= 29) {
    if (winner - loser !== 2) return `Vorsprung muss genau 2 Punkte betragen (aktuell: ${winner - loser}).`;
  }
  // Bei 30 Punkten: Verlierer muss 29 haben
  if (winner === 30 && loser !== 29) {
    return `Bei 30 Punkten muss der Verlierer 29 haben (aktuell: ${loser}).`;
  }
  return null;
}

function validateSets(sets: SetScore[], winningSide: 1 | 2): string | null {
  if (sets.length === 0) return "Mindestens ein Satz muss erfasst werden.";
  if (sets.length > 3) return "Maximal 3 Sätze sind im Badminton möglich.";

  for (let i = 0; i < sets.length; i++) {
    const err = validateBadmintonSet(sets[i].scoreTeam1, sets[i].scoreTeam2);
    if (err) return `Satz ${i + 1}: ${err}`;
  }

  // Prüfen ob die Satzanzahl zum Gewinner passt
  const team1Sets = sets.filter(s => s.scoreTeam1 > s.scoreTeam2).length;
  const team2Sets = sets.filter(s => s.scoreTeam2 > s.scoreTeam1).length;

  if (sets.length === 1) {
    // Nur 1 Satz: Gewinner muss diesen Satz gewonnen haben
    const singleSetWinner = sets[0].scoreTeam1 > sets[0].scoreTeam2 ? 1 : 2;
    if (singleSetWinner !== winningSide) return "Der ausgewählte Gewinner hat den Satz nicht gewonnen.";
  } else if (sets.length === 2) {
    // 2 Sätze: Gewinner muss beide gewonnen haben (2:0)
    if (team1Sets !== 2 && team2Sets !== 2) return "Bei 2 Sätzen muss ein Team beide Sätze gewonnen haben (2:0).";
    const setWinner = team1Sets === 2 ? 1 : 2;
    if (setWinner !== winningSide) return "Der ausgewählte Gewinner hat nicht beide Sätze gewonnen.";
  } else if (sets.length === 3) {
    // 3 Sätze: Gewinner muss 2 Sätze gewonnen haben (2:1)
    if (team1Sets !== 2 && team2Sets !== 2) return "Bei 3 Sätzen muss ein Team 2 Sätze gewonnen haben (2:1).";
    const setWinner = team1Sets === 2 ? 1 : 2;
    if (setWinner !== winningSide) return "Der ausgewählte Gewinner hat nicht 2 von 3 Sätzen gewonnen.";
  }

  return null;
}

export default function NewMatch() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: activeSeason } = trpc.seasons.active.useQuery();
  const { data: players } = trpc.players.listActive.useQuery();

  const createMutation = trpc.matches.create.useMutation({
    onSuccess: () => {
      utils.matches.listBySeason.invalidate();
      utils.matches.listAll.invalidate();
      utils.rankings.players.invalidate();
      utils.rankings.pairs.invalidate();
      toast.success("Spiel erfolgreich gespeichert!");
      setLocation("/matches");
    },
    onError: (e) => toast.error(e.message),
  });

  const [matchType, setMatchType] = useState<MatchType>("singles");
  const [team1P1, setTeam1P1] = useState("");
  const [team1P2, setTeam1P2] = useState("");
  const [team2P1, setTeam2P1] = useState("");
  const [team2P2, setTeam2P2] = useState("");
  const [winningSide, setWinningSide] = useState<1 | 2>(1);
  const [sets, setSets] = useState<SetScore[]>([{ scoreTeam1: 21, scoreTeam2: 0 }]);

  const isDoubles = matchType !== "singles";

  const addSet = () => {
    if (sets.length < 3) setSets(prev => [...prev, { scoreTeam1: 21, scoreTeam2: 0 }]);
    else toast.error("Maximal 3 Sätze sind im Badminton möglich.");
  };
  const removeSet = (i: number) => setSets(prev => prev.filter((_, idx) => idx !== i));
  const updateSet = (i: number, field: keyof SetScore, value: number) => {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: Math.max(0, Math.min(30, value)) } : s));
  };

  const getPlayerName = (id: string) => players?.find(p => p.id === parseInt(id))?.name ?? "";

  const team1Label = isDoubles
    ? `${getPlayerName(team1P1) || "Spieler 1"} & ${getPlayerName(team1P2) || "Spieler 2"}`
    : (getPlayerName(team1P1) || "Team 1");
  const team2Label = isDoubles
    ? `${getPlayerName(team2P1) || "Spieler 3"} & ${getPlayerName(team2P2) || "Spieler 4"}`
    : (getPlayerName(team2P1) || "Team 2");

  const team1Sets = sets.filter(s => s.scoreTeam1 > s.scoreTeam2).length;
  const team2Sets = sets.filter(s => s.scoreTeam2 > s.scoreTeam1).length;

  // Live-Validierung für jede Zeile
  const setErrors = sets.map(s => validateBadmintonSet(s.scoreTeam1, s.scoreTeam2));
  const overallSetError = validateSets(sets, winningSide);

  const handleSubmit = () => {
    if (!activeSeason) { toast.error("Keine aktive Saison. Bitte zuerst eine Saison anlegen."); return; }
    if (!team1P1 || !team2P1) { toast.error("Bitte alle Spieler auswählen."); return; }
    if (isDoubles && (!team1P2 || !team2P2)) { toast.error("Beim Doppel/Mixed müssen alle vier Spieler ausgewählt werden."); return; }

    const selectedIds = [team1P1, isDoubles ? team1P2 : null, team2P1, isDoubles ? team2P2 : null].filter(Boolean);
    if (new Set(selectedIds).size !== selectedIds.length) { toast.error("Derselbe Spieler kann nicht zweimal ausgewählt werden."); return; }

    const validationError = validateSets(sets, winningSide);
    if (validationError) { toast.error(validationError); return; }

    createMutation.mutate({
      seasonId: activeSeason.id,
      type: matchType,
      player1Id: parseInt(team1P1),
      player2Id: isDoubles && team1P2 ? parseInt(team1P2) : null,
      player3Id: parseInt(team2P1),
      player4Id: isDoubles && team2P2 ? parseInt(team2P2) : null,
      winningSide,
      sets,
    });
  };

  const playerOptions = players ?? [];

  const PlayerSelect = ({ value, onChange, exclude, label }: { value: string; onChange: (v: string) => void; exclude?: string[]; label: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-input border-border/50">
          <SelectValue placeholder="Spieler wählen…" />
        </SelectTrigger>
        <SelectContent>
          {playerOptions.filter(p => !exclude?.includes(String(p.id))).map(p => (
            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Spiel erfassen
          </h1>
          {activeSeason ? (
            <p className="text-muted-foreground mt-1">Saison <span className="text-primary font-medium">{activeSeason.name}</span></p>
          ) : (
            <p className="text-destructive mt-1 text-sm">⚠ Keine aktive Saison – bitte zuerst eine Saison anlegen.</p>
          )}
        </div>

        {/* Match Type */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Spielmodus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(["singles", "doubles", "mixed"] as MatchType[]).map(type => {
                const labels = { singles: "Einzel", doubles: "Doppel", mixed: "Mixed" };
                return (
                  <button
                    key={type}
                    onClick={() => { setMatchType(type); setTeam1P2(""); setTeam2P2(""); }}
                    className={`py-3 rounded-lg border text-sm font-medium transition-all ${matchType === type ? "bg-primary/10 border-primary text-primary" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"}`}
                  >
                    {labels[type]}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`bg-card border-2 transition-colors ${winningSide === 1 ? "border-primary/50" : "border-border/50"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Team 1</CardTitle>
                <button
                  onClick={() => setWinningSide(1)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${winningSide === 1 ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                >
                  Gewinner
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <PlayerSelect value={team1P1} onChange={setTeam1P1} exclude={[team1P2, team2P1, team2P2].filter(Boolean)} label="Spieler 1" />
              {isDoubles && <PlayerSelect value={team1P2} onChange={setTeam1P2} exclude={[team1P1, team2P1, team2P2].filter(Boolean)} label="Spieler 2" />}
            </CardContent>
          </Card>

          <Card className={`bg-card border-2 transition-colors ${winningSide === 2 ? "border-primary/50" : "border-border/50"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Team 2</CardTitle>
                <button
                  onClick={() => setWinningSide(2)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${winningSide === 2 ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                >
                  Gewinner
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <PlayerSelect value={team2P1} onChange={setTeam2P1} exclude={[team1P1, team1P2, team2P2].filter(Boolean)} label="Spieler 1" />
              {isDoubles && <PlayerSelect value={team2P2} onChange={setTeam2P2} exclude={[team1P1, team1P2, team2P1].filter(Boolean)} label="Spieler 2" />}
            </CardContent>
          </Card>
        </div>

        {/* Sets */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Sätze</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{team1Sets}</span>
                <span>:</span>
                <span className="font-semibold text-foreground">{team2Sets}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center text-xs text-muted-foreground px-1">
              <span className="truncate">{team1Label}</span>
              <span className="w-8 text-center"></span>
              <span className="truncate text-right">{team2Label}</span>
              <span className="w-8"></span>
            </div>
            <Separator className="bg-border/30" />
            {sets.map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateSet(i, "scoreTeam1", s.scoreTeam1 - 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Minus className="h-3 w-3" />
                    </button>
                    <Input
                      type="number"
                      value={s.scoreTeam1}
                      onChange={e => updateSet(i, "scoreTeam1", parseInt(e.target.value) || 0)}
                      className="h-9 text-center bg-input border-border/50 font-semibold text-lg"
                      min={0}
                      max={30}
                    />
                    <button onClick={() => updateSet(i, "scoreTeam1", s.scoreTeam1 + 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-muted-foreground font-bold text-center w-8">:</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateSet(i, "scoreTeam2", s.scoreTeam2 - 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Minus className="h-3 w-3" />
                    </button>
                    <Input
                      type="number"
                      value={s.scoreTeam2}
                      onChange={e => updateSet(i, "scoreTeam2", parseInt(e.target.value) || 0)}
                      className="h-9 text-center bg-input border-border/50 font-semibold text-lg"
                      min={0}
                      max={30}
                    />
                    <button onClick={() => updateSet(i, "scoreTeam2", s.scoreTeam2 + 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeSet(i)}
                    disabled={sets.length === 1}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
                {/* Inline-Fehler pro Satz */}
                {setErrors[i] && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 px-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{setErrors[i]}</span>
                  </div>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addSet}
              disabled={sets.length >= 3}
              className="w-full gap-2 border-dashed border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Satz hinzufügen {sets.length >= 3 ? "(max. 3)" : ""}
            </Button>

            {/* Hinweis-Box Badminton-Regeln */}
            <div className="rounded-lg bg-muted/20 border border-border/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/70">Gültige Badminton-Ergebnisse:</p>
              <p>• Sieger braucht mind. 21 Punkte mit ≥ 2 Punkte Vorsprung</p>
              <p>• Ab 20:20 (Einstand): Sieger braucht 2 Punkte Vorsprung (z.B. 22:20)</p>
              <p>• Maximum: 30:29 · Max. 3 Sätze (Best of 3)</p>
            </div>
          </CardContent>
        </Card>

        {/* Gesamt-Validierungsfehler */}
        {overallSetError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{overallSetError}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/matches")} className="flex-1">
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !activeSeason || !!overallSetError}
            className="flex-1 gap-2"
          >
            <Swords className="h-4 w-4" />
            {createMutation.isPending ? "Speichern…" : "Spiel speichern"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
