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
import { CalendarDays, CheckCircle2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Seasons() {
  const utils = trpc.useUtils();
  const { data: seasons, isLoading } = trpc.seasons.list.useQuery();
  const { data: activeSeason } = trpc.seasons.active.useQuery();

  const createMutation = trpc.seasons.create.useMutation({
    onSuccess: () => {
      utils.seasons.list.invalidate();
      utils.seasons.active.invalidate();
      toast.success("Saison angelegt und aktiviert.");
      setDialogOpen(false);
      setYear("");
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [year, setYear] = useState("");

  const handleCreate = () => {
    const y = parseInt(year);
    if (!y || y < 2000 || y > 2100) { toast.error("Bitte ein gültiges Jahr eingeben (2000–2100)."); return; }
    if (seasons?.some(s => s.year === y)) { toast.error("Diese Saison existiert bereits."); return; }
    createMutation.mutate({ year: y, name: `Saison ${y}` });
  };

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
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
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
            <Button onClick={() => setDialogOpen(true)} variant="outline" className="mt-4">Erste Saison anlegen</Button>
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
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">Jahr {s.year}</p>
                    </div>
                    {s.isActive ? (
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Neue Saison anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="year">Jahr</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder={String(new Date().getFullYear())}
                className="bg-input border-border/50"
                min={2000}
                max={2100}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Die neue Saison wird automatisch als aktive Saison gesetzt.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
