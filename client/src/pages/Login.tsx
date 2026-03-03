import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const utils = trpc.useUtils();

  const needsSetupQuery = trpc.auth.needsSetup.useQuery();
  const isSetup = needsSetupQuery.data === true;

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => {
      toast.error(err.message || "Anmeldung fehlgeschlagen.");
    },
  });

  const setupMutation = trpc.auth.setup.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => {
      toast.error(err.message || "Setup fehlgeschlagen.");
    },
  });

  // Wenn bereits eingeloggt, zur Startseite weiterleiten
  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  if (loading || needsSetupQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo & Titel */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Swords className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              ATSV Badminton Liga
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSetup ? "Erstmaliges Setup – Admin-Konto anlegen" : "Administrator-Anmeldung"}
            </p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isSetup ? "Admin-Konto einrichten" : "Anmelden"}
            </CardTitle>
            <CardDescription>
              {isSetup
                ? "Lege das Administrator-Konto für die Ligaverwaltung an."
                : "Nur Administratoren können Spiele und Spieler verwalten."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSetup ? (
              /* Setup-Formular */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setupMutation.mutate({ username: newUsername, password: newPassword });
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup-username">Benutzername</Label>
                  <Input
                    id="setup-username"
                    type="text"
                    placeholder="z.B. admin"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    minLength={3}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup-password">Passwort</Label>
                  <Input
                    id="setup-password"
                    type="password"
                    placeholder="Mindestens 6 Zeichen"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Einrichten…</>
                  ) : "Admin-Konto anlegen"}
                </Button>
              </form>
            ) : (
              /* Login-Formular */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loginMutation.mutate({ username, password });
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username">Benutzername</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Benutzername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Anmelden…</>
                  ) : "Anmelden"}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                onClick={() => setLocation("/")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Zurück zur Rangliste
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
