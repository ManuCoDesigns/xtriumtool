import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileJson, Loader2 } from "lucide-react";

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
  const [err, setErr] = useState("");

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <FileJson className="size-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Reviewer queue</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Reviewer sign in</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/"><ArrowLeft className="size-4" /> New submission</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-6 py-8">
        <Card className="p-6">
          {err && <p className="text-sm text-destructive">{err}</p>}
          {!rows && !err && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading submissions…
            </p>
          )}
          {rows && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          )}
          {rows && rows.length > 0 && (
            <div className="divide-y divide-border -mx-6">
              {rows.map((r) => {
                const s = r.validation?.summary;
                return (
                  <Link
                    key={r.id}
                    to="/submissions/$id"
                    params={{ id: r.id }}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{r.filename || "(untitled)"}</span>
                        <Badge variant="outline" className={STATUS_TONE[r.status]}>{r.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {r.source_url || "no source url"} · {new Date(r.created_at).toLocaleString()}
                      </div>
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