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
import { Minus, Plus, PlusCircle, Swords, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type MatchType = "singles" | "doubles" | "mixed";
type Winner = "team1" | "team2";

interface SetScore {
  team1Score: number;
  team2Score: number;
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
  const [winner, setWinner] = useState<Winner>("team1");
  const [sets, setSets] = useState<SetScore[]>([{ team1Score: 0, team2Score: 0 }]);
  const [notes, setNotes] = useState("");

  const isDoubles = matchType !== "singles";

  const addSet = () => setSets(prev => [...prev, { team1Score: 0, team2Score: 0 }]);
  const removeSet = (i: number) => setSets(prev => prev.filter((_, idx) => idx !== i));
  const updateSet = (i: number, field: keyof SetScore, value: number) => {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: Math.max(0, value) } : s));
  };

  const getPlayerName = (id: string) => players?.find(p => p.id === parseInt(id))?.name ?? "";

  const team1Label = isDoubles
    ? `${getPlayerName(team1P1) || "Spieler 1"} & ${getPlayerName(team1P2) || "Spieler 2"}`
    : (getPlayerName(team1P1) || "Team 1");
  const team2Label = isDoubles
    ? `${getPlayerName(team2P1) || "Spieler 3"} & ${getPlayerName(team2P2) || "Spieler 4"}`
    : (getPlayerName(team2P1) || "Team 2");

  const team1Sets = sets.filter(s => s.team1Score > s.team2Score).length;
  const team2Sets = sets.filter(s => s.team2Score > s.team1Score).length;

  const handleSubmit = () => {
    if (!activeSeason) { toast.error("Keine aktive Saison. Bitte zuerst eine Saison anlegen."); return; }
    if (!team1P1 || !team2P1) { toast.error("Bitte alle Spieler auswählen."); return; }
    if (isDoubles && (!team1P2 || !team2P2)) { toast.error("Beim Doppel/Mixed müssen alle vier Spieler ausgewählt werden."); return; }
    if (sets.length === 0) { toast.error("Mindestens ein Satz muss erfasst werden."); return; }

    // Check for duplicate players
    const selectedIds = [team1P1, isDoubles ? team1P2 : null, team2P1, isDoubles ? team2P2 : null].filter(Boolean);
    if (new Set(selectedIds).size !== selectedIds.length) { toast.error("Derselbe Spieler kann nicht zweimal ausgewählt werden."); return; }

    createMutation.mutate({
      seasonId: activeSeason.id,
      matchType,
      team1Player1Id: parseInt(team1P1),
      team1Player2Id: isDoubles && team1P2 ? parseInt(team1P2) : null,
      team2Player1Id: parseInt(team2P1),
      team2Player2Id: isDoubles && team2P2 ? parseInt(team2P2) : null,
      winner,
      notes: notes.trim() || null,
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
          <Card className={`bg-card border-2 transition-colors ${winner === "team1" ? "border-primary/50" : "border-border/50"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Team 1</CardTitle>
                <button
                  onClick={() => setWinner("team1")}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${winner === "team1" ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
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

          <Card className={`bg-card border-2 transition-colors ${winner === "team2" ? "border-primary/50" : "border-border/50"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Team 2</CardTitle>
                <button
                  onClick={() => setWinner("team2")}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${winner === "team2" ? "bg-primary text-primary-foreground border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
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
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center text-xs text-muted-foreground px-1">
              <span className="truncate">{team1Label}</span>
              <span className="w-8 text-center"></span>
              <span className="truncate text-right">{team2Label}</span>
              <span className="w-8"></span>
            </div>
            <Separator className="bg-border/30" />
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateSet(i, "team1Score", s.team1Score - 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Minus className="h-3 w-3" />
                  </button>
                  <Input
                    type="number"
                    value={s.team1Score}
                    onChange={e => updateSet(i, "team1Score", parseInt(e.target.value) || 0)}
                    className="h-9 text-center bg-input border-border/50 font-semibold text-lg"
                    min={0}
                  />
                  <button onClick={() => updateSet(i, "team1Score", s.team1Score + 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-muted-foreground font-bold text-center w-8">:</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateSet(i, "team2Score", s.team2Score - 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Minus className="h-3 w-3" />
                  </button>
                  <Input
                    type="number"
                    value={s.team2Score}
                    onChange={e => updateSet(i, "team2Score", parseInt(e.target.value) || 0)}
                    className="h-9 text-center bg-input border-border/50 font-semibold text-lg"
                    min={0}
                  />
                  <button onClick={() => updateSet(i, "team2Score", s.team2Score + 1)} className="w-7 h-7 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => removeSet(i)}
                  disabled={sets.length === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSet} className="w-full border-dashed border-border/50 text-muted-foreground hover:text-foreground gap-2">
              <PlusCircle className="h-4 w-4" />
              Satz hinzufügen
            </Button>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">Notizen (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="z.B. Besondere Umstände, Kommentare…"
                className="bg-input border-border/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setLocation("/matches")} className="border-border/50">
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || !activeSeason} className="gap-2 min-w-32">
            <Swords className="h-4 w-4" />
            {createMutation.isPending ? "Speichern…" : "Spiel speichern"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
