import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — Xtrium Validator" },
      { name: "description", content: "Manage users and assign roles." },
    ],
  }),
  component: AdminUsers,
});

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "admin" | "reviewer" | "submitter";
  created_at: string;
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

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  async function checkAuth() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      navigate({ to: "/auth" });
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.user.id)
      .single();

    if (!profile || !["super_admin", "admin"].includes(profile.role)) {
      setErr("You don't have permission to access this page.");
      return;
    }

    setCurrentUser(profile);
    loadUsers();
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
    } else {
      setUsers(data as UserProfile[]);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;
      
      // Reload users
      await loadUsers();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUpdating(null);
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{err || "Loading..."}</p>
      </div>
    );
  }

  if (err && !users) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <p className="text-sm text-destructive">{err}</p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/">Back</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">User Management</h1>
              <p className="text-xs text-muted-foreground">Manage users and assign roles</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/submissions">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-6 py-8">
        <Card className="p-6 mb-6 shadow-lg border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Logged in as</p>
              <p className="font-semibold truncate">{currentUser.email}</p>
              <Badge className={`${ROLE_COLORS[currentUser.role]} capitalize mt-1`}>
                {ROLE_LABELS[currentUser.role]}
              </Badge>
            </div>
          </div>
        </Card>

        {err && (
          <Card className="p-4 border-destructive/30 bg-destructive/5 mb-6">
            <p className="text-sm text-destructive">{err}</p>
          </Card>
        )}

        <Card className="p-6 shadow-lg border-border/40 animate-in fade-in slide-in-from-top-2 duration-500">
          {!users && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading users…
            </p>
          )}
          {users && users.length === 0 && (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          )}
          {users && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-4 px-4">Email</th>
                    <th className="text-left py-4 px-4">Name</th>
                    <th className="text-left py-4 px-4">Role</th>
                    <th className="text-left py-4 px-4">Joined</th>
                    <th className="text-left py-4 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} className="border-b border-border/40 hover:bg-accent/30 transition-all animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="py-4 px-4 font-medium">{user.email}</td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {user.full_name || <span className="text-xs italic">Not set</span>}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={ROLE_COLORS[user.role]}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-4 px-4">
                        {currentUser.id === user.id ? (
                          <span className="text-xs text-muted-foreground">You</span>
                        ) : currentUser.role === "super_admin" ? (
                          <Select
                            value={user.role}
                            onValueChange={(role) => updateUserRole(user.id, role)}
                            disabled={updating === user.id}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="reviewer">Reviewer</SelectItem>
                              <SelectItem value="submitter">Submitter</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-6 p-4 bg-muted rounded-lg text-xs text-muted-foreground">
          <p className="font-medium mb-2">Role Permissions:</p>
          <ul className="space-y-1">
            <li><strong>Super Admin:</strong> Manage all users and roles</li>
            <li><strong>Admin:</strong> Review submissions, update status and notes</li>
            <li><strong>Reviewer:</strong> Review submissions and add notes</li>
            <li><strong>Submitter:</strong> Create and view own submissions</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
