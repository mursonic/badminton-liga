import DashboardLayout from "@/components/DashboardLayout";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Pencil, PlusCircle, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Gender = "male" | "female" | "other";

interface PlayerData {
  id: number;
  name: string;
  active: boolean;
  gender: Gender;
  createdAt: Date;
}

const genderLabel: Record<Gender, string> = {
  male: "Männlich",
  female: "Weiblich",
  other: "Divers / k.A.",
};

export default function Players() {
  const utils = trpc.useUtils();
  const { data: players, isLoading } = trpc.players.list.useQuery();

  const createMutation = trpc.players.create.useMutation({
    onSuccess: () => {
      utils.players.list.invalidate();
      utils.players.listActive.invalidate();
      toast.success("Spieler angelegt.");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.players.update.useMutation({
    onSuccess: () => {
      utils.players.list.invalidate();
      utils.players.listActive.invalidate();
      toast.success("Spieler aktualisiert.");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.players.delete.useMutation({
    onSuccess: () => {
      utils.players.list.invalidate();
      utils.players.listActive.invalidate();
      toast.success("Spieler gelöscht.");
    },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerData | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [gender, setGender] = useState<Gender>("other");

  const resetForm = () => { setName(""); setActive(true); setGender("other"); };

  const openCreate = () => { resetForm(); setEditing(null); setDialogOpen(true); };

  const openEdit = (p: PlayerData) => {
    setEditing(p);
    setName(p.name);
    setActive(p.active);
    setGender(p.gender ?? "other");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name ist erforderlich."); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, name: name.trim(), active, gender });
    } else {
      createMutation.mutate({ name: name.trim(), active, gender });
    }
  };

  const handleDelete = (id: number, playerName: string) => {
    if (confirm(`Spieler "${playerName}" wirklich löschen?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const active_players = players?.filter(p => p.active) ?? [];
  const inactive_players = players?.filter(p => !p.active) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Spielerverwaltung
            </h1>
            <p className="text-muted-foreground mt-1">{players?.length ?? 0} Spieler insgesamt</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Spieler hinzufügen
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Lade Spieler…</div>
        ) : (
          <>
            {active_players.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Aktive Spieler ({active_players.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border/30">
                    {active_players.map(p => (
                      <PlayerRow key={p.id} player={p as PlayerData} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {inactive_players.length > 0 && (
              <Card className="bg-card border-border/50 opacity-70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-muted-foreground">
                    Inaktive Spieler ({inactive_players.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border/30">
                    {inactive_players.map(p => (
                      <PlayerRow key={p.id} player={p as PlayerData} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {players?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Noch keine Spieler angelegt.</p>
                <Button onClick={openCreate} variant="outline" className="mt-4">
                  Ersten Spieler hinzufügen
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              {editing ? "Spieler bearbeiten" : "Neuer Spieler"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Vollständiger Name"
                className="bg-input border-border/50"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Geschlecht</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger id="gender" className="bg-input border-border/50">
                  <SelectValue placeholder="Geschlecht wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                  <SelectItem value="other">Divers / k.A.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active">Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Speichern" : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function PlayerRow({
  player,
  onEdit,
  onDelete,
}: {
  player: PlayerData;
  onEdit: (p: PlayerData) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const genderBadge: Record<Gender, string> = {
    male: "♂",
    female: "♀",
    other: "",
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-primary">{player.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">
          {player.name}
          {genderBadge[player.gender ?? "other"] && (
            <span className="ml-1.5 text-muted-foreground text-sm">{genderBadge[player.gender ?? "other"]}</span>
          )}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(player)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(player.id, player.name)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
