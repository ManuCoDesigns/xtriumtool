import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCHEMA_REGISTRY } from "@/lib/validation/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, XCircle, AlertTriangle, Info } from "lucide-react";
import Header from "@/components/header";
import type { Finding } from "@/lib/validation/checks";

export const Route = createFileRoute("/submissions/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Submission ${params.id.slice(0, 8)} — Xtrium Validator` },
      { name: "description", content: "Reviewer view of a submitted dataset." },
    ],
  }),
  component: SubmissionDetail,
});

type Status = "pending" | "approved" | "rejected" | "needs_changes";
type Submission = {
  id: string;
  filename: string | null;
  source_url: string | null;
  schema_id: string | null;
  payload: unknown;
  validation: {
    ok?: boolean;
    ready_for_llm?: boolean;
    summary?: { fatal: number; errors: number; warnings: number; info: number };
    findings?: Finding[];
  } | null;
  status: Status;
  reviewer_notes: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
};

const SEV_STYLE: Record<Finding["severity"], string> = {
  fatal: "bg-destructive/15 text-destructive border-destructive/30",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  warn: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30",
  info: "bg-muted text-muted-foreground border-border",
  review: "bg-primary/10 text-primary border-primary/30",
};

function orderPayloadBySchema(payload: unknown, schema: unknown): unknown {
  if (Array.isArray(payload)) {
    if (schema && typeof schema === "object" && "items" in schema) {
      return payload.map((item) => orderPayloadBySchema(item, (schema as any).items));
    }
    return payload.map((item) => orderPayloadBySchema(item, {}));
  }

  if (payload && typeof payload === "object") {
    const schemaProps = schema && typeof schema === "object" && typeof (schema as any).properties === "object" ? (schema as any).properties : {};
    const ordered: Record<string, unknown> = {};

    const schemaKeys = Object.keys(schemaProps);
    const payloadKeys = Object.keys(payload as Record<string, unknown>);

    for (const key of schemaKeys) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        ordered[key] = orderPayloadBySchema((payload as any)[key], schemaProps[key]);
      }
    }

    for (const key of payloadKeys) {
      if (!schemaKeys.includes(key)) {
        ordered[key] = orderPayloadBySchema((payload as any)[key], {});
      }
    }

    return ordered;
  }

  return payload;
}

function SubmissionDetail() {
  const { id } = Route.useParams();
  const [sub, setSub] = useState<Submission | null>(null);
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<Status | "notes" | null>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (supabase.from("submissions" as any) as any).select("*").eq("id", id).single()
      .then(({ data, error }: any) => {
        if (error) setErr(error.message);
        else {
          setSub(data as Submission);
          setNotes(data?.reviewer_notes ?? "");
        }
      });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u.user) { setSignedIn(false); setIsReviewer(false); return; }
      setSignedIn(true);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (cancelled) return;
      setIsReviewer(!!roles?.some((r) => r.role === "reviewer" || r.role === "admin" || r.role === "super_admin"));
    }
    check();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function setStatus(status: Status) {
    setSaving(status);
    const { error } = await (supabase.from("submissions" as any) as any).update({ status }).eq("id", id);
    setSaving(null);
    if (error) setErr(error.message);
    else setSub((s) => (s ? { ...s, status } : s));
  }

  async function saveNotes() {
    setSaving("notes");
    const { error } = await (supabase.from("submissions" as any) as any).update({ reviewer_notes: notes }).eq("id", id);
    setSaving(null);
    if (error) setErr(error.message);
  }

  if (err) return <Shell><p className="text-sm text-destructive p-6">{err}</p></Shell>;
  if (!sub) return <Shell><p className="text-sm text-muted-foreground p-6 flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</p></Shell>;

  const findings = sub.validation?.findings ?? [];
  const s = sub.validation?.summary;
  const schema = sub.schema_id ? SCHEMA_REGISTRY[sub.schema_id]?.schema : undefined;
  const orderedPayload = useMemo(() => orderPayloadBySchema(sub.payload, schema), [sub.payload, schema]);

  return (
    <Shell>
      <div className="space-y-6">
        <Card className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="font-semibold truncate">{sub.filename || "(untitled)"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sub.source_url ? <a href={sub.source_url} target="_blank" rel="noreferrer" className="underline">{sub.source_url}</a> : "no source url"}
              </p>
              <p className="text-xs text-muted-foreground">
                schema: <code>{sub.schema_id || "—"}</code> · submitted {new Date(sub.created_at).toLocaleString()}
              </p>
            </div>
            <Badge variant="outline" className="capitalize">{sub.status.replace("_", " ")}</Badge>
          </div>
          {isReviewer && s && (
            <div className="grid grid-cols-4 gap-2 text-sm">
              <Stat label="Fatal" value={s.fatal} tone="err" />
              <Stat label="Errors" value={s.errors} tone="err" />
              <Stat label="Warnings" value={s.warnings} tone="warn" />
              <Stat label="Info" value={s.info} tone="muted" />
            </div>
          )}
          {isReviewer ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => setStatus("approved")} disabled={!!saving}>
                {saving === "approved" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("needs_changes")} disabled={!!saving}>
                Request changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus("rejected")} disabled={!!saving}>
                <XCircle className="size-3.5" /> Reject
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus("pending")} disabled={!!saving}>
                Reset to pending
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground pt-2">
              {signedIn
                ? "Your account doesn't have the reviewer role yet. Ask an admin to grant it."
                : <>Reviewer actions require sign-in. <a href="/auth" className="underline">Sign in</a>.</>}
            </p>
          )}
        </Card>

        <Card className="p-6 space-y-2">
          <h3 className="font-semibold text-sm">Reviewer notes</h3>
          {isReviewer ? (
            <>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Notes for the submitter…" />
              <div>
                <Button size="sm" onClick={saveNotes} disabled={saving === "notes"}>
                  {saving === "notes" ? <Loader2 className="size-3.5 animate-spin" /> : null} Save notes
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[1.5rem]">
              {sub.reviewer_notes || <span className="italic">No notes yet.</span>}
            </p>
          )}
        </Card>

        {isReviewer ? (
          <>
            {findings.length > 0 && (
              <Card className="p-6 space-y-3">
                <h3 className="font-semibold text-sm">Findings ({findings.length})</h3>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {findings.map((f, i) => {
                    const Icon = f.severity === "warn" ? AlertTriangle : f.severity === "info" ? Info : XCircle;
                    return (
                      <div key={i} className={`rounded-md border px-3 py-2 text-sm ${SEV_STYLE[f.severity]}`}>
                        <div className="flex items-start gap-2">
                          <Icon className="size-4 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono">{f.code}</code>
                              <code className="text-xs font-mono opacity-70 truncate">{f.path}</code>
                            </div>
                            <p className="mt-0.5">{f.message}</p>
                            {f.suggestion && <p className="mt-1 text-xs opacity-80">→ {f.suggestion}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-sm">Submitted payload</h3>
                <Badge variant="outline">Schema: {sub.schema_id || "unknown"}</Badge>
              </div>
              <pre className="font-mono text-xs bg-muted rounded-md p-3 max-h-[500px] overflow-auto">
                {JSON.stringify(orderedPayload, null, 2)}
              </pre>
            </Card>
          </>
        ) : (
          <Card className="p-6 space-y-2">
            <h3 className="font-semibold text-sm">Submission details</h3>
            <p className="text-sm text-muted-foreground">Detailed payload and validation findings are visible to reviewers and admins only.</p>
          </Card>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header title="Submission" />
      <main className="container mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "err" | "warn" | "muted" }) {
  const color = tone === "err" ? "text-destructive" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}