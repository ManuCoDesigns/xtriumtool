import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileJson, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/submissions/")({
  head: () => ({
    meta: [
      { title: "Submissions — Xtrium Validator" },
      { name: "description", content: "Reviewer queue for submitted datasets." },
    ],
  }),
  component: SubmissionsList,
});

type Row = {
  id: string;
  filename: string | null;
  source_url: string | null;
  status: "pending" | "approved" | "rejected" | "needs_changes";
  created_at: string;
  validation: { summary?: { fatal: number; errors: number; warnings: number; info: number }; ok?: boolean } | null;
};

const STATUS_TONE: Record<Row["status"], string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  needs_changes: "bg-primary/10 text-primary border-primary/30",
};

function SubmissionsList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filteredRows, setFilteredRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "needs_changes">("all");

  useEffect(() => {
    supabase
      .from("submissions")
      .select("id, filename, source_url, status, created_at, validation")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setRows((data ?? []) as Row[]);
      });
  }, []);

  useEffect(() => {
    if (!rows) return;
    let filtered = rows;
    if (filter !== "all") {
      filtered = filtered.filter((r) => r.status === filter);
    }
    if (search) {
      filtered = filtered.filter((r) =>
        (r.filename || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.source_url || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredRows(filtered);
  }, [rows, filter, search]);

  const stats = rows ? {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    needsChanges: rows.filter((r) => r.status === "needs_changes").length,
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileJson className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Submissions Queue</h1>
              <p className="text-xs text-muted-foreground">Review and manage dataset submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/"><ArrowLeft className="size-4" /> New submission</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-6 py-8">
        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
            <StatCard label="Pending" value={stats.pending} color="amber" icon={Clock} />
            <StatCard label="Approved" value={stats.approved} color="green" icon={CheckCircle2} />
            <StatCard label="Rejected" value={stats.rejected} color="destructive" icon={XCircle} />
            <StatCard label="Changes Needed" value={stats.needsChanges} color="blue" icon={AlertTriangle} />
          </div>
        )}

        {/* Search and filter */}
        {rows && rows.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-500 delay-100">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "pending", "approved", "rejected", "needs_changes"] as const).map((s) => (
                <Button
                  key={s}
                  variant={filter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(s)}
                  className="capitalize transition-all"
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Card className="p-6 shadow-lg border-border/40 animate-in fade-in slide-in-from-top-2 duration-500 delay-150">
          {err && <p className="text-sm text-destructive">{err}</p>}
          {!rows && !err && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading submissions…
            </p>
          )}
          {(filteredRows && filteredRows.length === 0) && (
            <div className="text-center py-12">
              <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground mb-1">{search || filter !== "all" ? "No submissions match your filters." : "No submissions yet."}</p>
              {search || filter !== "all" ? (
                <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs text-primary underline hover:no-underline">
                  Clear filters
                </button>
              ) : null}
            </div>
          )}
          {filteredRows && filteredRows.length > 0 && (
            <div className="space-y-3">
              {filteredRows.map((r, i) => {
                const s = r.validation?.summary;
                return (
                  <Link
                    key={r.id}
                    to="/submissions/$id"
                    params={{ id: r.id }}
                    className="group block p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-500"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{r.filename || "(untitled)"}</span>
                          <Badge variant="outline" className={`${STATUS_TONE[r.status]} capitalize`}>{r.status.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="truncate max-w-xs">{r.source_url || "—"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      {s && (
                        <div className="flex items-center gap-2">
                          {s.fatal > 0 && <Badge variant="destructive" className="gap-1 text-xs"><AlertCircle className="size-3" /> {s.fatal}</Badge>}
                          {s.errors > 0 && <Badge className="gap-1 text-xs" style={{ background: "hsl(0 84% 60%)" }}><XCircle className="size-3" /> {s.errors}</Badge>}
                          {s.warnings > 0 && <Badge className="gap-1 text-xs" style={{ background: "hsl(38 92% 50%)" }}><AlertTriangle className="size-3" /> {s.warnings}</Badge>}
                          {s.fatal === 0 && s.errors === 0 && s.warnings === 0 && <Badge className="gap-1 text-xs" variant="secondary"><CheckCircle2 className="size-3" /> OK</Badge>}
                        </div>
                      )}
                    </div>
                    {s && (
                      <div className="text-xs font-mono flex gap-2 shrink-0">
                        <span className="text-destructive">{s.fatal + s.errors} err</span>
                        <span className="text-amber-600">{s.warnings} warn</span>
                        <span className="text-muted-foreground">{s.info} info</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon?: React.ComponentType<{ className?: string }> }) {
  const colors = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    green: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  } as const;
  return (
    <Card className={`p-4 border ${colors[color as keyof typeof colors]} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium opacity-75 mb-1">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        {Icon && <Icon className="size-8 opacity-20" />}
      </div>
    </Card>
  );
}