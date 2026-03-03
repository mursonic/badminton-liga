import DashboardLayout from "@/components/DashboardLayout";
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
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Pencil, PlusCircle, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Gender = "male" | "female" | "other";

interface PlayerData {
  id: number;
  name: string;
  nickname: string | null;
  gender: "male" | "female" | "other";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const genderLabel: Record<Gender, string> = {
  male: "Männlich",
  female: "Weiblich",
  other: "Divers",
};

const genderBadge: Record<Gender, string> = {
  male: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  female: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  other: "bg-purple-500/10 text-purple-400 border-purple-500/20",
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
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender>("other");
  const [active, setActive] = useState(true);

  const resetForm = () => {
    setName("");
    setNickname("");
    setGender("other");
    setActive(true);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (p: PlayerData) => {
    setEditing(p);
    setName(p.name);
    setNickname(p.nickname ?? "");
    setGender(p.gender as Gender);
    setActive(p.active);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name ist erforderlich."); return; }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name: name.trim(),
        nickname: nickname.trim() || null,
        gender,
        active,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        gender,
        active,
      });
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
                      <PlayerRow key={p.id} player={p} onEdit={openEdit} onDelete={handleDelete} />
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
                      <PlayerRow key={p.id} player={p} onEdit={openEdit} onDelete={handleDelete} />
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
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nickname">Spitzname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Optional"
                className="bg-input border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Geschlecht</Label>
              <Select value={gender} onValueChange={v => setGender(v as Gender)}>
                <SelectTrigger className="bg-input border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                  <SelectItem value="other">Divers</SelectItem>
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
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-primary">{player.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{player.name}</p>
        {player.nickname && <p className="text-xs text-muted-foreground">"{player.nickname}"</p>}
      </div>
      <Badge variant="outline" className={`text-xs ${genderBadge[player.gender as Gender] ?? ""}`}>
        {genderLabel[player.gender as Gender] ?? player.gender}
      </Badge>
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
