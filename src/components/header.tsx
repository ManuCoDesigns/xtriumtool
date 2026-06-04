import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isMissingColumnError, isMissingTableError } from "@/integrations/supabase/db-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Settings, Inbox, Bell } from "lucide-react";
import NotificationsDropdown from "@/components/notifications-dropdown";

export default function Header({ title }: { title?: string }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ id: string; email: string; full_name: string | null; role: string } | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const isReviewer = userProfile?.role === "reviewer" || userProfile?.role === "admin" || userProfile?.role === "super_admin";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser.user) { 
          setUser(null); 
          setUserProfile(null); 
          return; 
        }
        if (cancelled) return;
        
        setUser({ id: authUser.user.id, email: authUser.user.email || "" });

        // Load profile and count in parallel with cache bust
        const timestamp = Date.now();
        const profileQuery = (supabase as any)
          .from("profiles")
          .select("id, email, full_name, role", { head: false })
          .eq("id", authUser.user.id)
          .limit(1);
        
        const countQuery = (supabase as any)
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.user.id);

        const [profileResult, countResult] = await Promise.allSettled([profileQuery, countQuery]);

        if (cancelled) return;
        
        if (profileResult.status === "fulfilled") {
          const { data: profiles, error: profileError } = profileResult.value;
          if (profiles && profiles.length > 0) {
            setUserProfile(profiles[0] as any);
          } else if (isMissingTableError(profileError)) {
            setUserProfile(null);
          }
        }

        if (countResult.status === "fulfilled") {
          const { error: countError, count } = countResult.value as any;
          if (!countError && typeof count === "number") {
            setSubmissionCount(count);
          } else if (isMissingColumnError(countError)) {
            const email = authUser.user.email || "";
            if (email) {
              const fallback = await (supabase as any)
                .from("submissions")
                .select("id", { count: "exact", head: true })
                .eq("submitted_by", email);
              if (!cancelled && !fallback.error && typeof fallback.count === "number") {
                setSubmissionCount(fallback.count);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Header load error", e);
      }
    }
    load();
    
    // Only listen for sign out, don't reload on every state change
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setUserProfile(null);
        setSubmissionCount(0);
      }
    });
    
    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
  }

  return (
    <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-50">
      <div className="container mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center size-9 rounded-lg text-white shadow" style={{ background: "var(--gradient-primary)" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v18M3 12h18" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title || "Xtrium Dataset Validator"}</h1>
            <p className="text-xs text-muted-foreground">Submit, validate, and review datasets</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="text-xs text-right mr-2 hidden sm:block">
                <p className="font-medium">{userProfile?.full_name || user.email}</p>
                <p className="text-muted-foreground">{userProfile?.role}</p>
              </div>
              {userProfile?.role === "admin" || userProfile?.role === "super_admin" ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/users" title="Admin"><Settings className="size-4" /></Link>
                </Button>
              ) : null}
              {isReviewer ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/submissions"><Inbox className="size-4" /> Reviewer queue</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile" title="Profile"><User className="size-4" /></Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out"><LogOut className="size-4" /></Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <a href="/auth">Sign in</a>
            </Button>
          )}
          {!isReviewer && user ? (
            <Badge className="text-xs text-muted-foreground">Submitter access</Badge>
          ) : null}

          <div className="relative">
            <button aria-label="Notifications" onClick={() => setShowDropdown((s) => !s)} className="p-2 rounded-md hover:bg-muted/20">
              <Bell className="size-4" />
            </button>
            {submissionCount > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] w-5 h-5">{submissionCount}</span>}
            {showDropdown && (
              <div className="absolute right-0 mt-2 z-50">
                <NotificationsDropdown userId={user?.id ?? null} userEmail={user?.email ?? null} />
              </div>
            )}
          </div>

          <Badge className="font-mono text-xs text-white border-0" style={{ background: "var(--gradient-primary)" }}>v1.0</Badge>
        </div>
      </div>
    </header>
  );
}
