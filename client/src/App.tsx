import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import QuizList from "./pages/QuizList";

const QuizPractice = lazy(() => import("./pages/QuizPractice"));
const QuizResults = lazy(() => import("./pages/QuizResults"));
const AIAgent = lazy(() => import("./pages/AIAgent"));
const CurriculumManagement = lazy(() => import("./pages/CurriculumManagement"));

function RouteLoadingFallback() {
  return <main className="container py-10" aria-live="polite"><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="h-4 w-28 animate-pulse rounded bg-muted" /><div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded bg-muted" /><p className="mt-5 text-sm text-muted-foreground">Opening Paramount Academy workspace…</p></div></main>;
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path={"/"} component={QuizList} />
        <Route path={"/quiz/:quizId"} component={QuizPractice} />
        <Route path={"/results/:attemptId"} component={QuizResults} />
        <Route path={"/generate"} component={AIAgent} />
        <Route path={"/curriculum"} component={CurriculumManagement} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
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
