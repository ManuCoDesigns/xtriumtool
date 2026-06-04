import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useDropzone } from "react-dropzone";
import { diffLines } from "diff";
import {
  AlertTriangle, CheckCircle2, FileJson, Loader2, Sparkles, XCircle, Info, Send, Inbox, LogOut, Settings, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validate, type Finding } from "@/lib/validation/checks";
import { SCHEMA_REGISTRY, type SchemaId } from "@/lib/validation/schema";
import { llmReview } from "@/lib/llm-review.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xtrium Dataset Validator" },
      { name: "description", content: "Submit, validate, and LLM-review JSON datasets against the Xtrium Supplier Graph schema." },
      { property: "og:title", content: "Xtrium Dataset Validator" },
      { property: "og:description", content: "Schema, null, enum, unit, regex, and LLM-assisted HTML reconciliation in one pipeline." },
    ],
  }),
  component: Index,
});

type ValidationResult = ReturnType<typeof validate>;

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  fatal: "bg-destructive/15 text-destructive border-destructive/40",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  warn: "bg-warning/15 text-warning-foreground border-warning/40 [color:oklch(0.45_0.15_75)]",
  info: "bg-accent/30 text-accent-foreground border-accent/50",
  review: "bg-primary/10 text-primary border-primary/30",
};

function Index() {
  const [raw, setRaw] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [submittedBy, setSubmittedBy] = useState<string>("");
  const [schemaId, setSchemaId] = useState<SchemaId>("bgs_supplier_graph_v1");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [parseError, setParseError] = useState<string>("");
  const [llmLoading, setLlmLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const navigate = useNavigate();
  const [llmResult, setLlmResult] = useState<{
    corrected: unknown; changes: Array<{ path: string; reason: string; before?: unknown; after?: unknown }>; error?: string;
  } | null>(null);

  // Auth state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ id: string; email: string; full_name: string | null; role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const callLlm = useServerFn(llmReview);

  // Load user and profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user) {
        setUser({ id: authUser.user.id, email: authUser.user.email || "" });
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("id", authUser.user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
          setSubmittedBy(profile.full_name || profile.email);
        }
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setSubmittedBy("");
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { "application/json": [".json"] },
    onDrop: (files) => {
      const f = files[0];
      if (!f) return;
      setFilename(f.name);
      f.text().then(setRaw);
    },
  });

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      setParseError("");
      return JSON.parse(raw);
    } catch (e) {
      setParseError((e as Error).message);
      return null;
    }
  }, [raw]);

  function runValidation() {
    if (parsed === null) return;
    setLlmResult(null);
    setResult(validate(parsed, SCHEMA_REGISTRY[schemaId].schema));
  }

  async function runLlmReview() {
    if (!parsed || !sourceUrl) return;
    setLlmLoading(true);
    setLlmResult(null);
    try {
      const r = await callLlm({ data: { submitted: parsed, source_url: sourceUrl } });
      setLlmResult(r);
    } catch (e) {
      setLlmResult({ corrected: parsed, changes: [], error: (e as Error).message });
    } finally {
      setLlmLoading(false);
    }
  }

  async function submitForReview() {
    if (!parsed || !user) {
      navigate({ to: "/auth" });
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        user_id: user.id,
        filename: filename || null,
        source_url: sourceUrl || null,
        schema_id: schemaId,
        payload: parsed,
        validation: (result ?? null) as never,
        submitted_by: submittedBy || user.email,
        submitted_by_name: userProfile?.full_name || submittedBy || user.email,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) { setSubmitErr(error.message); return; }
    navigate({ to: "/submissions/$id", params: { id: data.id } });
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-40 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 relative">
        <div className="container mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center size-9 rounded-lg text-white shadow-lg"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <FileJson className="size-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}>
              Xtrium Dataset Validator
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {authLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                <div className="text-xs text-right mr-2 hidden sm:block">
                  <p className="font-medium">{userProfile?.full_name || user.email}</p>
                  <p className="text-muted-foreground">{userProfile?.role}</p>
                </div>
                {userProfile?.role === "admin" || userProfile?.role === "super_admin" ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/users" title="Admin">
                      <Settings className="size-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link to="/profile" title="Profile">
                    <User className="size-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/submissions"><Inbox className="size-4" /> Reviewer queue</Link>
            </Button>
            <Badge className="font-mono text-xs text-white border-0" style={{ background: "var(--gradient-primary)" }}>v1.0</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-6 py-8 space-y-6 relative">
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Upload */}
          <Card className="p-6 space-y-4 border-primary/20 shadow-lg">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <span className="inline-block size-6 rounded-md text-white text-xs grid place-items-center" style={{ background: "var(--gradient-primary)" }}>1</span>
                Submit dataset
              </h2>
              <p className="text-sm text-muted-foreground">
                Drop a JSON file or paste below. Validated against the selected schema.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schema">Schema</Label>
              <select
                id="schema"
                value={schemaId}
                onChange={(e) => { setSchemaId(e.target.value as SchemaId); setResult(null); setLlmResult(null); }}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {Object.entries(SCHEMA_REGISTRY).map(([id, s]) => (
                  <option key={id} value={id}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{SCHEMA_REGISTRY[schemaId].description}</p>
            </div>
            <div
              {...getRootProps()}
              className={`rounded-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
              }`}
            >
              <input {...getInputProps()} />
              <FileJson className="mx-auto size-8 text-muted-foreground mb-2" />
              <p className="text-sm">{filename || "Drop a .json file here or click to browse"}</p>
            </div>
            <textarea
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setFilename(""); }}
              placeholder={schemaId === "nasa_tpsx_materials_v1" ? '{"material_name": "...", ...}' : '{"company_name": "...", ...}'}
              spellCheck={false}
              className="w-full h-48 rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {parseError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <XCircle className="size-3.5" /> JSON parse error: {parseError}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={runValidation} disabled={!parsed}>Run validation</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRaw(schemaId === "nasa_tpsx_materials_v1" ? NASA_SAMPLE : BGS_SAMPLE);
                  setFilename("sample.json");
                }}
              >
                Load sample
              </Button>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 space-y-4 border-accent/30 shadow-lg" style={{ background: "linear-gradient(160deg, oklch(0.99 0.02 200), oklch(1 0 0))" }}>
            <h2 className="font-semibold flex items-center gap-2">
              <span className="inline-block size-6 rounded-md text-white text-xs grid place-items-center" style={{ background: "var(--gradient-accent)" }}>2</span>
              Overview
            </h2>
            {!result ? (
              <p className="text-sm text-muted-foreground">Run validation to see findings here.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {result.ok ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : (
                    <XCircle className="size-5 text-destructive" />
                  )}
                  <span className="font-medium">{result.ok ? "All checks passed" : "Issues found"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Fatal" value={result.summary.fatal} tone="fatal" />
                  <Stat label="Errors" value={result.summary.errors} tone="error" />
                  <Stat label="Warnings" value={result.summary.warnings} tone="warn" />
                  <Stat label="Info" value={result.summary.info} tone="info" />
                </div>
                {result.ready_for_llm && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Ready for LLM review.
                  </p>
                )}
              </div>
            )}
          </Card>
        </section>

        {/* Findings list */}
        {result && result.findings.length > 0 && (
          <Card className="p-6 space-y-3 border-warning/30 shadow-lg">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="inline-block size-6 rounded-md text-white text-xs grid place-items-center" style={{ background: "var(--gradient-warm)" }}>3</span>
              Findings ({result.findings.length})
            </h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {result.findings.map((f, i) => (
                <FindingRow key={i} finding={f} />
              ))}
            </div>
          </Card>
        )}

        {/* LLM review */}
        <Card className="p-6 space-y-4 border-primary/20 shadow-lg" style={{ background: "linear-gradient(160deg, oklch(0.99 0.03 285), oklch(1 0 0))" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <span className="inline-block size-6 rounded-md text-white text-xs grid place-items-center" style={{ background: "var(--gradient-primary)" }}>4</span>
                <Sparkles className="size-4 text-primary" /> LLM HTML reconciliation
              </h2>
              <p className="text-sm text-muted-foreground">
                Fetches the source page, compares against your JSON, proposes a corrected version. Powered by Lovable AI.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div className="space-y-1.5">
              <Label htmlFor="src">Source URL</Label>
              <Input
                id="src"
                placeholder="https://www.bgs.ac.uk/..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
            <Button
              onClick={runLlmReview}
              disabled={!parsed || !sourceUrl || llmLoading || (result ? !result.ready_for_llm : false)}
            >
              {llmLoading ? <><Loader2 className="size-4 animate-spin" /> Reviewing…</> : "Run LLM review"}
            </Button>
          </div>
          {!result?.ready_for_llm && result && (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> Fix fatal/error findings before running LLM review.
            </p>
          )}
          {llmResult?.error && (
            <p className="text-xs text-destructive">{llmResult.error}</p>
          )}
          {llmResult && !llmResult.error && (
            <DiffView
              before={parsed}
              after={llmResult.corrected}
              changes={llmResult.changes}
            />
          )}
        </Card>

        {/* Submit for review */}
        <Card className="p-6 space-y-4 border-accent/30 shadow-lg">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <span className="inline-block size-6 rounded-md text-white text-xs grid place-items-center" style={{ background: "var(--gradient-accent)" }}>5</span>
              <Send className="size-4 text-primary" /> Submit for review
            </h2>
            <p className="text-sm text-muted-foreground">
              Saves the dataset, source URL, and validation report so a reviewer can open it later.
            </p>
          </div>
          {!user ? (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                You must sign in to submit datasets.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Sign in or create account</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="who">Submitted by</Label>
                  <Input 
                    id="who" 
                    placeholder="Your name" 
                    value={submittedBy} 
                    onChange={(e) => setSubmittedBy(e.target.value)} 
                    disabled={!!userProfile?.full_name}
                    title={userProfile?.full_name ? "Using your profile name" : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.full_name ? `Using: ${userProfile.full_name}` : "Add your name to identify your submissions"}
                  </p>
                </div>
                <Button onClick={submitForReview} disabled={!parsed || submitting}>
                  {submitting ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : <><Send className="size-4" /> Submit for review</>}
                </Button>
              </div>
              {!result && parsed && (
                <p className="text-xs text-muted-foreground">Tip: run validation first so the reviewer sees the findings.</p>
              )}
              {submitErr && <p className="text-xs text-destructive">{submitErr}</p>}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "fatal" | "error" | "warn" | "info" }) {
  const colors = {
    fatal: "text-destructive",
    error: "text-destructive",
    warn: "text-warning",
    info: "text-primary",
  } as const;
  const bgs = {
    fatal: "bg-destructive/10 border-destructive/30",
    error: "bg-destructive/5 border-destructive/20",
    warn: "bg-warning/10 border-warning/30",
    info: "bg-primary/5 border-primary/20",
  } as const;
  return (
    <div className={`rounded-md border px-3 py-2 ${bgs[tone]}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${colors[tone]}`}>{value}</div>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const Icon = finding.severity === "warn" ? AlertTriangle : finding.severity === "info" ? Info : XCircle;
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${SEVERITY_STYLES[finding.severity]}`}>
      <div className="flex items-start gap-2">
        <Icon className="size-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono">{finding.code}</code>
            <code className="text-xs font-mono opacity-70 truncate">{finding.path}</code>
          </div>
          <p className="mt-0.5">{finding.message}</p>
          {finding.suggestion && (
            <p className="mt-1 text-xs opacity-80">→ {finding.suggestion}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffView({
  before, after, changes,
}: {
  before: unknown; after: unknown;
  changes: Array<{ path: string; reason: string; before?: unknown; after?: unknown }>;
}) {
  const a = JSON.stringify(before, null, 2);
  const b = JSON.stringify(after, null, 2);
  const parts = diffLines(a, b);
  return (
    <div className="space-y-4">
      {changes.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium">LLM-proposed changes ({changes.length})</h3>
          <ul className="space-y-1">
            {changes.map((c, i) => (
              <li key={i} className="text-xs rounded-md border border-border px-2.5 py-1.5">
                <code className="font-mono">{c.path}</code> — {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="bg-muted px-3 py-1.5 text-xs font-medium border-b border-border flex justify-between">
          <span>Submitted</span><span>← / →</span><span>LLM corrected</span>
        </div>
        <pre className="font-mono text-xs leading-relaxed max-h-[500px] overflow-auto">
          {parts.map((p, i) => (
            <div
              key={i}
              className={
                p.added ? "bg-green-500/10 text-green-800 dark:text-green-300"
                : p.removed ? "bg-red-500/10 text-red-800 dark:text-red-300"
                : "text-foreground"
              }
            >
              {p.value.split("\n").filter((_, j, arr) => j < arr.length - 1 || arr.length === 1).map((line, k) => (
                <div key={k} className="px-3">
                  <span className="select-none opacity-50 mr-2">
                    {p.added ? "+" : p.removed ? "-" : " "}
                  </span>{line}
                </div>
              ))}
            </div>
          ))}
        </pre>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(after, null, 2))}>
          Copy LLM version
        </Button>
        <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(before, null, 2))}>
          Copy submitted version
        </Button>
      </div>
    </div>
  );
}

const BGS_SAMPLE = JSON.stringify({
  supplier_id: null,
  duns_number: null,
  company_name: "Sibelco UK",
  canonical_name: "sibelco-uk",
  headquarters_location: "Sandbach, United Kingdom",
  website: null,
  company_description: null,
  industry_sector: "industrial minerals",
  supply_chain_tier: 1,
  typical_lead_time_days: null,
  manufacturing_sites: [{
    location: "Bent Farm Quarry (SJ834614)",
    country: "England",
    site_type: "quarry",
    raw: "Bent Farm Quarry, SJ 834 614 Congleton, Sibelco UK. End Use: Foundry sand.",
  }],
  certification_references: [],
  certifications_raw: null,
  regulation_references: [],
  products_offered: [{
    product_name: "Silica Sand",
    grade: "Foundry sand",
    product_id: "SJ834614_SS_FDY",
    category: "SILICA SAND",
    source_url: "https://www.bgs.ac.uk/mineralsuk/download/directory-of-mines-and-quarries-2020/",
    datasheet_url: null,
    cross_graph_material_id: null,
  }],
  is_verified: false,
  data_completeness_flags: { review_score: "manual_only" },
  sources: [{
    source_name: "BGS Directory of Mines and Quarries 2020, 11th Edition",
    source_url: "https://www.bgs.ac.uk/mineralsuk/download/directory-of-mines-and-quarries-2020/",
    doi: null,
    tier: "tier1",
  }],
}, null, 2);

const NASA_SAMPLE = JSON.stringify({
  material_id: null,
  material_name: "Polyimide Film Sample",
  canonical_name: "polyimide-film-sample",
  cas_number: null,
  material_type: "polymer",
  material_subtype: null,
  grade: null,
  trade_names: [],
  is_variant: false,
  base_material_canonical_name: null,
  supplier_context: {
    supplier_canonical_name: "nasa-langley-research-center-database",
    supplier_product_id: null,
    supplier_grade_name: null,
    datasheet_url: "https://tpsx.arc.nasa.gov/Material?id=1437",
  },
  properties: [{
    name: "Tensile Strength Isotropic",
    canonical_name: "tensile_strength_isotropic",
    value: "8.34e+07",
    numeric_value: 83400000,
    unit: "Pa",
    condition: "STP",
    property_category: "mechanical",
    raw: { Value: "83400000.0", Units: "Pa" },
    source: {
      source_name: "measured",
      source_url: "https://tpsx.arc.nasa.gov/Material?id=1437",
      doi: null,
      tier: "tier1",
    },
  }],
  standards_referenced: ["ASTM D882"],
  compliance_references: [],
  applications_mentioned: [],
  processing_notes: null,
  hazard_flags: [],
  availability_notes: null,
  images: [],
  sources: [{
    source_name: "NASA Langley Research Center Database",
    source_url: "https://tpsx.arc.nasa.gov/Material?id=1437",
    doi: null,
    tier: "tier1",
  }],
}, null, 2);
