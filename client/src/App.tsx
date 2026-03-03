import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Seasons from "./pages/Seasons";
import NewMatch from "./pages/NewMatch";
import PlayerRanking from "./pages/PlayerRanking";
import PairRanking from "./pages/PairRanking";
import Matches from "./pages/Matches";
import Statistics from "./pages/Statistics";
import Login from "./pages/Login";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/** Schützt Admin-Seiten: leitet zur Login-Seite weiter wenn nicht eingeloggt */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Öffentliche Seiten */}
      <Route path="/" component={Home} />
      <Route path="/matches" component={Matches} />
      <Route path="/ranking/players" component={PlayerRanking} />
      <Route path="/ranking/pairs" component={PairRanking} />
      <Route path="/statistics" component={Statistics} />
      <Route path="/login" component={Login} />

      {/* Admin-geschützte Seiten */}
      <Route path="/matches/new">
        {() => <AdminRoute component={NewMatch} />}
      </Route>
      <Route path="/players">
        {() => <AdminRoute component={Players} />}
      </Route>
      <Route path="/seasons">
        {() => <AdminRoute component={Seasons} />}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
