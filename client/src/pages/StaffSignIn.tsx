import React from "react";
import { AcademyShell } from "@/components/AcademyShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowLeft, BadgeCheck, CheckCircle2, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function StaffSignIn() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const roleLabel = user?.role === "admin" ? "Portal Admin" : user?.role === "teacher" ? "Teacher" : "No staff role yet";

  return (
    <AcademyShell eyebrow="Paramount Academy staff access">
      <main className="container py-8 sm:py-12">
        <section className="mx-auto max-w-5xl space-y-5">
          <Button type="button" variant="ghost" className="academy-back-button" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" />Back to Quiz Centre</Button>
          <Card className="overflow-hidden border-primary/15 bg-card shadow-[0_18px_55px_oklch(0.36_0.12_255_/_0.08)]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <CardHeader className="border-b border-border/70 bg-primary/[0.025] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
                <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Secure staff access</p>
                <CardTitle className="mt-2 text-3xl tracking-[-0.05em]">Sign in before staff access.</CardTitle>
                <CardDescription className="mt-2 max-w-xl text-sm leading-6">One secure identity check, then a clear academy approval decision. Paramount Academy does not collect or store staff passwords, mobile numbers, or separate Google credentials.</CardDescription>
                <div className="mt-7 space-y-3" role="region" aria-label="Staff access process">
                  {[{ number: "1", title: "Verify identity", detail: "Use the secure sign-in service you already trust.", icon: LockKeyhole }, { number: "2", title: "Portal Admin approval", detail: "Your exact verified email is approved for Teacher access.", icon: UserCheck }, { number: "3", title: "Enter the workspace", detail: "Your approved role determines what you can manage.", icon: BadgeCheck }].map(({ number, title, detail, icon: Icon }) => <div key={number} className="flex gap-3 rounded-xl border border-border/70 bg-background/60 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{number}</span><div><p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground"><Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p></div></div>)}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col justify-center space-y-5 p-6 sm:p-8">
                <div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Your session</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-foreground">{loading ? "Checking secure session" : user ? "You are signed in." : "Ready when you are."}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{loading ? "We are confirming the secure identity already associated with this browser." : user ? "Your current role is shown below; this page never changes it." : "Continue to the secure identity service. You will return here after verification."}</p></div>
                {loading ? <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 animate-pulse text-primary" />Checking your secure session…</div> : user ? <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">Current account</p><p className="mt-1 text-lg font-extrabold text-foreground">{roleLabel}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{user.email ?? "Your verified sign-in identity"}</p><div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/70 p-3 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{user.role === "user" ? "Identity verified. Portal Admin approval is still required before staff tools become available." : "Role access has already been set by Portal Admin."}</div><Button type="button" className="mt-4 w-full sm:w-auto" onClick={() => navigate("/")}>Return to Quiz Centre</Button></div> : <Button type="button" className="w-full sm:w-auto" onClick={() => { window.location.href = getLoginUrl(); }}><ShieldCheck className="mr-2 h-4 w-4" />Continue to secure sign in</Button>}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4"><div className="flex gap-3"><UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-extrabold text-foreground">Approval happens after identity verification.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">For Teacher access, Portal Admin must approve the exact sign-in email in Staff access. Portal Admin access is never granted automatically; it requires an explicit role change by an existing Portal Admin.</p></div></div></div>
              </CardContent>
            </div>
          </Card>
        </section>
      </main>
    </AcademyShell>
  );
}
