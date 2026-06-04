import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isMissingTableError } from "@/integrations/supabase/db-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, User, LogOut, AlertCircle } from "lucide-react";
import Header from "@/components/header";


export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Xtrium Validator" },
      { name: "description", content: "View and edit your profile." },
    ],
  }),
  component: ProfilePage,
});

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin" | "reviewer" | "submitter";
  created_at: string;
  updated_at: string;
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  admin: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  reviewer: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  submitter: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  reviewer: "Reviewer",
  submitter: "Submitter",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [navigate]);

  async function loadProfile() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      navigate({ to: "/auth" });
      return;
    }

    const { data, error } = await supabase
      .from("profiles" as any)
      .select("*")
      .eq("id", user.user.id)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        setProfile({
          id: user.user.id,
          email: user.user.email || "",
          full_name: null,
          role: "submitter",
          created_at: "",
          updated_at: "",
        });
        setErr("Profile storage is unavailable; showing account information only.");
      } else {
        setErr(error.message);
      }
    } else {
      setProfile(data as UserProfile);
      setFullName(data.full_name || "");
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      if (!profile || !profile.created_at) {
        throw new Error("Profile updates are unavailable until the database schema is available.");
      }

      const { error } = await (supabase.from("profiles" as any) as any)
        .update({
          full_name: fullName || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;
      
      setMsg("Profile updated successfully!");
      await loadProfile();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            {err ? (
              <><AlertCircle className="size-4" /> {err}</>
            ) : (
              <><Loader2 className="size-4 animate-spin" /> Loading profile…</>
            )}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Header title="My Profile" />

      <main className="container mx-auto max-w-2xl px-6 py-8">
        <Card className="p-6 space-y-6 shadow-lg border-border/40 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Info Section */}
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 transition-colors">
              <Label className="text-xs font-semibold text-muted-foreground">Email Address</Label>
              <p className="font-medium mt-2 break-all">{profile.email}</p>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 transition-colors">
              <Label className="text-xs font-semibold text-muted-foreground">Your Role</Label>
              <div className="mt-2">
                <Badge className={`${ROLE_COLORS[profile.role]} capitalize`}>
                  {ROLE_LABELS[profile.role]}
                </Badge>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 transition-colors">
              <Label className="text-xs font-semibold text-muted-foreground">Member Since</Label>
              <p className="font-medium mt-2">{new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>

          {/* Edit Section */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-medium">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-10 transition-all focus-visible:ring-offset-0 focus-visible:ring-2"
              />
              <p className="text-xs text-muted-foreground">This name will appear on your submissions</p>
            </div>

            {err && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 flex items-center gap-2"><AlertCircle className="size-4" /> {err}</div>}
            {msg && <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm border border-green-500/20">✓ {msg}</div>}

            <Button type="submit" disabled={busy} className="w-full h-10 font-medium transition-all">
              {busy ? <><Loader2 className="size-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
            </Button>
          </form>

          {/* Sign Out */}
          <div className="pt-6 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground">Want to sign out?</p>
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
              onClick={handleSignOut}
            >
              <LogOut className="size-4 mr-2" /> Sign Out
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
