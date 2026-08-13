import React from "react";
import { BookOpenCheck, ClipboardList, LibraryBig, Settings2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Quiz Centre", icon: ClipboardList },
  { href: "/generate", label: "Build Draft", icon: BookOpenCheck },
  { href: "/curriculum", label: "Curriculum", icon: LibraryBig },
];

export function AcademyShell({ children, eyebrow = "FBISE Academic Workspace" }: { children: React.ReactNode; eyebrow?: string }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="container flex min-h-18 flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Paramount Academy</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
            </div>
          </Link>
          <nav aria-label="Quiz engine navigation" className="flex items-center gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-sm">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold no-underline transition-colors sm:text-sm", active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        Paramount Academy · MCQ drafting and review workspace
      </footer>
    </div>
  );
}
