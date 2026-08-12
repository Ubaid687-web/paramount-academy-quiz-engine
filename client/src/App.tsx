import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import QuizList from "./pages/QuizList";
import QuizPractice from "./pages/QuizPractice";
import QuizResults from "./pages/QuizResults";
import AIAgent from "./pages/AIAgent";
import CurriculumManagement from "./pages/CurriculumManagement";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={QuizList} />
      <Route path={"/quiz/:quizId"} component={QuizPractice} />
      <Route path={"/results/:attemptId"} component={QuizResults} />
      <Route path={"/generate"} component={AIAgent} />
      <Route path={"/curriculum"} component={CurriculumManagement} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
