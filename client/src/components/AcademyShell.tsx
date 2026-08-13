import React from "react";
import { BookOpenCheck, ClipboardList, LibraryBig } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function AcademyShell({ children, eyebrow = "FBISE Academic Workspace", showAdministration = false }: { children: React.ReactNode; eyebrow?: string; showAdministration?: boolean }) {
  const [location] = useLocation();
  const navigation = [
    { href: "/", label: "Quiz Centre", icon: ClipboardList },
    ...(showAdministration ? [{ href: "/curriculum", label: "Curriculum", icon: LibraryBig }] : []),
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 sm:min-h-20">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_18px_oklch(0.36_0.12_255_/_0.2)] sm:h-10 sm:w-10">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-[-0.03em] text-foreground sm:text-[15px]">Paramount Academy</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">{eyebrow}</p>
            </div>
          </Link>
          <nav aria-label="Quiz engine navigation" className="flex items-center gap-1 rounded-full border border-border/80 bg-card p-1 shadow-sm">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} aria-label={item.label} className={cn("flex h-9 items-center gap-2 rounded-full px-2.5 text-xs font-bold no-underline transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.96] sm:px-3 sm:text-sm", active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
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
