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
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, Lock, LockOpen, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Season {
  id: number;
  year: number;
  name: string;
  isActive: boolean;
  isClosed: boolean;
}

type DialogMode = "create" | "edit";

export default function Seasons() {
  const utils = trpc.useUtils();
  const { data: seasons, isLoading } = trpc.seasons.list.useQuery();
  const { data: activeSeason } = trpc.seasons.active.useQuery();

  const createMutation = trpc.seasons.create.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Saison angelegt und aktiviert.");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.seasons.update.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Saison aktualisiert.");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.seasons.delete.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Saison gelöscht.");
    },
    onError: (e) => toast.error(e.message),
  });

  const setActiveMutation = trpc.seasons.setActive.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Aktive Saison geändert.");
    },
    onError: (e) => toast.error(e.message),
  });

  const closeMutation = trpc.seasons.close.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Saison abgeschlossen.");
    },
    onError: (e) => toast.error(e.message),
  });

  const reopenMutation = trpc.seasons.reopen.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Saison wieder geöffnet.");
    },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState("");

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSeason(null);
    setName("");
    setYear("");
  };

  const openCreate = () => {
    setDialogMode("create");
    setName("");
    setYear("");
    setEditingSeason(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Season) => {
    setDialogMode("edit");
    setEditingSeason(s);
    setName(s.name);
    setYear(String(s.year));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const y = parseInt(year);
    if (!y || y < 2000 || y > 2100) { toast.error("Bitte ein gültiges Jahr eingeben (2000–2100)."); return; }
    if (!name.trim()) { toast.error("Name ist erforderlich."); return; }

    if (dialogMode === "create") {
      if (seasons?.some(s => s.year === y)) { toast.error("Diese Saison existiert bereits."); return; }
      createMutation.mutate({ year: y, name: name.trim() });
    } else if (editingSeason) {
      updateMutation.mutate({ id: editingSeason.id, name: name.trim(), year: y });
    }
  };

  const handleDelete = (s: Season) => {
    if (confirm(`Saison "${s.name}" wirklich löschen? Saisons mit Spielen können nicht gelöscht werden.`)) {
      deleteMutation.mutate({ id: s.id });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Saisonverwaltung
            </h1>
            {activeSeason && (
              <p className="text-muted-foreground mt-1">
                Aktive Saison: <span className="text-primary font-medium">{activeSeason.name}</span>
              </p>
            )}
          </div>
          <Button onClick={openCreate} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Neue Saison
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Lade Saisons…</div>
        ) : seasons?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Noch keine Saisons angelegt.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4">Erste Saison anlegen</Button>
          </div>
        ) : (
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Alle Saisons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/30">
                {seasons?.map(s => (
                  <div key={s.id} className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">Jahr {s.year}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {s.isClosed ? (
                        <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500 text-xs">
                          <Lock className="h-3 w-3" />
                          Abgeschlossen
                        </Badge>
                      ) : s.isActive ? (
                        <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktiv
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-border/50"
                          onClick={() => setActiveMutation.mutate({ id: s.id })}
                          disabled={setActiveMutation.isPending}
                        >
                          Aktivieren
                        </Button>
                      )}

                      {s.isClosed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
                          onClick={() => reopenMutation.mutate({ id: s.id })}
                          disabled={reopenMutation.isPending}
                          title="Saison wieder öffnen"
                        >
                          <LockOpen className="h-3.5 w-3.5" />
                          Öffnen
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-amber-500 hover:text-amber-400 gap-1 h-7 px-2"
                          onClick={() => {
                            if (confirm(`Saison "${s.name}" wirklich abschließen? Sie wird als inaktiv markiert und kann später wieder geöffnet werden.`)) {
                              closeMutation.mutate({ id: s.id });
                            }
                          }}
                          disabled={closeMutation.isPending}
                          title="Saison abschließen"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Abschließen
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(s)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              {dialogMode === "create" ? "Neue Saison anlegen" : "Saison bearbeiten"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="season-name">Name</Label>
              <Input
                id="season-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Saison 2026"
                className="bg-input border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="season-year">Jahr</Label>
              <Input
                id="season-year"
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder={String(new Date().getFullYear())}
                className="bg-input border-border/50"
                min={2000}
                max={2100}
              />
            </div>
            {dialogMode === "create" && (
              <p className="text-xs text-muted-foreground">
                Die neue Saison wird automatisch als aktive Saison gesetzt.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {dialogMode === "create" ? "Anlegen" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
