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
import { ArrowLeft, CheckCircle2, Trophy, Users2, XCircle } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

type TabType = "singles" | "doubles";

export default function PlayerDetail() {
  const params = useParams<{ id: string }>();
  const playerId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();

  const { data: players } = trpc.players.list.useQuery();
  const { data: seasons } = trpc.seasons.list.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabType>("singles");

  const seasonId = selectedSeasonId === "all" ? null : parseInt(selectedSeasonId);

  const { data: playerMatches, isLoading } = trpc.playerDetail.getMatches.useQuery(
    { playerId, seasonId },
    { enabled: !!playerId }
  );

  const { data: ranking } = trpc.rankings.players.useQuery({ seasonId });

  const playerMap = new Map((players ?? []).map(p => [p.id, p]));
  const player = playerMap.get(playerId);

  if (!player && players) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">
          <p>Spieler nicht gefunden.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/ranking/players")}>
            Zurück zur Rangliste
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Statistiken ─────────────────────────────────────────────────────────────
  const singlesMatches = playerMatches?.filter(m => m.type === "singles") ?? [];
  const doublesMatches = playerMatches?.filter(m => m.type !== "singles") ?? [];

  const computeStats = (ms: typeof singlesMatches) => {
    const wins = ms.filter(m => m.winningSide === m.playerSide).length;
    const losses = ms.length - wins;
    const pf = ms.reduce((a, m) => a + (m.playerSide === 1 ? m.scoreTeam1 : m.scoreTeam2), 0);
    const pa = ms.reduce((a, m) => a + (m.playerSide === 1 ? m.scoreTeam2 : m.scoreTeam1), 0);
    const ratio = pa === 0 ? (pf > 0 ? "∞" : "0.00") : (pf / pa).toFixed(2);
    return { wins, losses, gamesPlayed: ms.length, points: wins * 3 + losses, pf, pa, ratio };
  };

  const singleStats = computeStats(singlesMatches);
  const doubleStats = computeStats(doublesMatches);

  const rankRow = ranking?.findIndex(r => r.playerId === playerId);
  const rank = rankRow !== undefined && rankRow >= 0 ? rankRow + 1 : null;

  // ─── Head-to-Head (Einzel) ────────────────────────────────────────────────────
  const h2hMap = new Map<number, { wins: number; losses: number; name: string }>();
  for (const m of singlesMatches) {
    const oppId = m.opponent1Id;
    const oppName = playerMap.get(oppId)?.name ?? `#${oppId}`;
    if (!h2hMap.has(oppId)) h2hMap.set(oppId, { wins: 0, losses: 0, name: oppName });
    const entry = h2hMap.get(oppId)!;
    if (m.winningSide === m.playerSide) entry.wins++;
    else entry.losses++;
  }
  const h2h = Array.from(h2hMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

  // ─── Partner-Bilanz (Doppel/Mixed) ───────────────────────────────────────────
  const partnerMap = new Map<number, { wins: number; losses: number; name: string; types: Set<string> }>();
  for (const m of doublesMatches) {
    const partnerId = m.partner1Id;
    if (!partnerId) continue;
    const partnerName = playerMap.get(partnerId)?.name ?? `#${partnerId}`;
    if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { wins: 0, losses: 0, name: partnerName, types: new Set() });
    const entry = partnerMap.get(partnerId)!;
    entry.types.add(m.type);
    if (m.winningSide === m.playerSide) entry.wins++;
    else entry.losses++;
  }
  const partners = Array.from(partnerMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));

  const typeLabel: Record<string, string> = { singles: "Einzel", doubles: "Doppel" };
  const genderLabel: Record<string, string> = { male: "Herren", female: "Damen", other: "Divers" };

  const currentStats = activeTab === "singles" ? singleStats : doubleStats;
  const currentMatches = activeTab === "singles" ? singlesMatches : doublesMatches;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => setLocation("/ranking/players")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
              {player?.name ?? "…"}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {player?.gender && (
                <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
                  {genderLabel[player.gender] ?? player.gender}
                </Badge>
              )}
              {player && !player.active && (
                <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">Inaktiv</Badge>
              )}
              {rank && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Einzel-Platz {rank}
                </Badge>
              )}
            </div>
          </div>
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-44 bg-input border-border/50 shrink-0">
              <SelectValue placeholder="Saison wählen" />
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
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("singles")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "singles" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Einzel
            <span className="ml-1.5 text-xs opacity-60">({singleStats.gamesPlayed})</span>
          </button>
          <button
            onClick={() => setActiveTab("doubles")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "doubles" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Doppel
            <span className="ml-1.5 text-xs opacity-60">({doubleStats.gamesPlayed})</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Spiele", value: currentStats.gamesPlayed, icon: <Trophy className="h-4 w-4" /> },
            { label: "Siege", value: currentStats.wins, icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
            { label: "Niederlagen", value: currentStats.losses, icon: <XCircle className="h-4 w-4 text-destructive" /> },
            { label: "Punkte", value: currentStats.points, icon: <Trophy className="h-4 w-4 text-primary" /> },
          ].map(stat => (
            <Card key={stat.label} className="bg-card border-border/50">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="flex justify-center mb-1 text-muted-foreground">{stat.icon}</div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Head-to-Head / Partner-Bilanz */}
          {activeTab === "singles" ? (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  Head-to-Head (Einzel)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {h2h.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Noch keine Einzelspiele.</p>
                ) : (
                  <div className="divide-y divide-border/20">
                    {h2h.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between py-2.5">
                        <button
                          className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors text-left"
                          onClick={() => setLocation(`/players/${entry.id}`)}
                        >
                          {entry.name}
                        </button>
                        <div className="flex items-center gap-1.5 text-sm shrink-0">
                          <span className="text-green-500 font-semibold">{entry.wins}S</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-destructive font-semibold">{entry.losses}N</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  Partner-Bilanz
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Noch keine Doppel-/Mixed-Spiele.</p>
                ) : (
                  <div className="divide-y divide-border/20">
                    {partners.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <button
                            className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors text-left"
                            onClick={() => setLocation(`/players/${entry.id}`)}
                          >
                            {entry.name}
                          </button>
                          <div className="flex gap-1 mt-0.5">
                            {Array.from(entry.types).map(t => (
                              <span key={t} className="text-xs text-muted-foreground">{typeLabel[t]}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm shrink-0">
                          <span className="text-green-500 font-semibold">{entry.wins}S</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-destructive font-semibold">{entry.losses}N</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Statistiken */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Statistiken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Punkte erzielt", value: currentStats.pf },
                { label: "Punkte kassiert", value: currentStats.pa },
                { label: "Ratio", value: currentStats.ratio },
                { label: "Siegquote", value: currentStats.gamesPlayed > 0 ? `${Math.round((currentStats.wins / currentStats.gamesPlayed) * 100)} %` : "–" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold text-foreground">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Match History */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Spielhistorie ({currentStats.gamesPlayed})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Lade Spiele…</p>
            ) : currentMatches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Noch keine {activeTab === "singles" ? "Einzel-" : "Doppel-/Mixed-"}Spiele in dieser Auswahl.
              </p>
            ) : (
              <div className="divide-y divide-border/20">
                {currentMatches.map(m => {
                  const won = m.winningSide === m.playerSide;
                  const oppName = playerMap.get(m.opponent1Id)?.name ?? `#${m.opponent1Id}`;
                  const opp2Name = m.opponent2Id ? playerMap.get(m.opponent2Id)?.name : null;
                  const partnerName = m.partner1Id ? playerMap.get(m.partner1Id)?.name : null;
                  const myScore = m.playerSide === 1 ? m.scoreTeam1 : m.scoreTeam2;
                  const oppScore = m.playerSide === 1 ? m.scoreTeam2 : m.scoreTeam1;
                  const seasonName = seasons?.find(s => s.id === m.seasonId)?.name;
                  return (
                    <div key={m.matchId} className="py-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${won ? "bg-green-500" : "bg-destructive"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${won ? "text-green-500" : "text-destructive"}`}>
                            {won ? "Sieg" : "Niederlage"}
                          </span>
                          <Badge variant="outline" className="text-xs border-border/40 text-muted-foreground px-1.5 py-0">
                            {typeLabel[m.type] ?? m.type}
                          </Badge>
                          {seasonName && selectedSeasonId === "all" && (
                            <span className="text-xs text-muted-foreground">{seasonName}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {partnerName ? `${player?.name} & ${partnerName}` : player?.name}
                          {" vs "}
                          {opp2Name ? `${oppName} & ${opp2Name}` : oppName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {myScore} : {oppScore}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.playedAt).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
