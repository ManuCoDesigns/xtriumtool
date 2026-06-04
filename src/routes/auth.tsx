import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Lock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Reviewer sign in — Xtrium Validator" },
      { name: "description", content: "Sign in as a reviewer to action submissions." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/submissions" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/submissions` },
        });
        if (error) throw error;
        setMsg("Account created. Check your email to confirm, then sign in. A reviewer must grant you the 'reviewer' role before you can action submissions.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/submissions" });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex flex-col">
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Reviewer Access</h1>
              <p className="text-xs text-muted-foreground">Secure authentication</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/"><ArrowLeft className="size-4" /> Back</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md p-6 shadow-lg border-border/40 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="space-y-2 mb-6">
            <h2 className="text-lg font-semibold">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin" ? "Sign in to review submissions and manage content" : "Join the review team to help validate datasets"}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email Address</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="your@email.com" className="h-10 transition-all focus-visible:ring-offset-0 focus-visible:ring-2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" className="h-10 transition-all focus-visible:ring-offset-0 focus-visible:ring-2" />
            </div>
            {err && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 flex items-start gap-2"><AlertCircle className="size-4 mt-0.5 flex-shrink-0" /><span>{err}</span></div>}
            {msg && <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm border border-blue-500/20">{msg}</div>}
            <Button type="submit" disabled={busy} className="w-full h-10 font-medium transition-all">
              {busy ? <><Loader2 className="size-4 animate-spin mr-2" /> {mode === "signin" ? "Signing in..." : "Creating account..."}</> : (mode === "signin" ? "Sign in" : "Create account")}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border">
            <button
              type="button"
              className="w-full text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setErr(null); setMsg(null); setMode(mode === "signin" ? "signup" : "signin"); }}
            >
              {mode === "signin" ? <span>Don't have an account? <span className="text-primary font-medium">Sign up</span></span> : <span>Already have an account? <span className="text-primary font-medium">Sign in</span></span>}
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}