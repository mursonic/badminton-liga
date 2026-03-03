import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/players" component={Players} />
      <Route path="/seasons" component={Seasons} />
      <Route path="/matches/new" component={NewMatch} />
      <Route path="/matches" component={Matches} />
      <Route path="/ranking/players" component={PlayerRanking} />
      <Route path="/ranking/pairs" component={PairRanking} />
      <Route path="/statistics" component={Statistics} />
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
