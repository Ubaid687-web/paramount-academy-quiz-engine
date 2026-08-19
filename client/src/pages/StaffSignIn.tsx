import React from "react";
import { AcademyShell } from "@/components/AcademyShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowLeft, ShieldCheck, UserCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function StaffSignIn() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const roleLabel = user?.role === "admin" ? "Portal Admin" : user?.role === "teacher" ? "Teacher" : "No staff role yet";

  return (
    <AcademyShell eyebrow="Paramount Academy staff access">
      <main className="container py-8 sm:py-12">
        <section className="mx-auto max-w-2xl space-y-5">
          <Button type="button" variant="ghost" className="academy-back-button" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" />Back to Quiz Centre</Button>
          <Card className="overflow-hidden border-primary/15 bg-card shadow-[0_18px_55px_oklch(0.36_0.12_255_/_0.08)]">
            <CardHeader className="border-b border-border/70 bg-primary/[0.025] p-6 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">Secure staff access</p>
              <CardTitle className="mt-2 text-3xl tracking-[-0.05em]">Sign in before staff access.</CardTitle>
              <CardDescription className="mt-2 max-w-xl text-sm leading-6">Paramount Academy does not collect or store staff passwords, mobile numbers, or separate Google credentials. The existing secure sign-in service verifies identity first; staff permissions are then controlled inside this Portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6 sm:p-8">
              {loading ? <p className="text-sm text-muted-foreground">Checking your secure session…</p> : user ? <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">Current account</p><p className="mt-1 text-lg font-extrabold text-foreground">{roleLabel}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{user.email ?? "Your verified sign-in identity"}</p><Button type="button" className="mt-4" onClick={() => navigate("/")}>Return to Quiz Centre</Button></div> : <Button type="button" className="w-full sm:w-auto" onClick={() => { window.location.href = getLoginUrl(); }}><ShieldCheck className="mr-2 h-4 w-4" />Continue to secure sign in</Button>}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4"><div className="flex gap-3"><UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-extrabold text-foreground">Approval happens after identity verification.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">For Teacher access, Portal Admin must approve the exact sign-in email in Staff access. Portal Admin access is never granted automatically; it requires an explicit role change by an existing Portal Admin.</p></div></div></div>
            </CardContent>
          </Card>
        </section>
      </main>
    </AcademyShell>
  );
}
