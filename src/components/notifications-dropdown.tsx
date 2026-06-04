import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isMissingColumnError } from "@/integrations/supabase/db-utils";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function NotificationsDropdown({ userId, userEmail }: { userId: string | null; userEmail?: string | null }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId && !userEmail) return;

    async function loadNotifications() {
      const query = userId
        ? supabase.from<any>("submissions").select("id, filename, source_url, created_at").eq("user_id", userId)
        : supabase.from<any>("submissions").select("id, filename, source_url, created_at").eq("submitted_by", userEmail!);

      let { data, error } = await query.order("created_at", { ascending: false }).limit(10);
      if (error && userId && isMissingColumnError(error) && userEmail) {
        const fallback = await (supabase.from("submissions" as any) as any)
          .select("id, filename, source_url, created_at")
          .eq("submitted_by", userEmail)
          .order("created_at", { ascending: false })
          .limit(10);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) setErr(error.message);
      else setItems(data ?? []);
    }

    loadNotifications();
  }, [userId, userEmail]);

  return (
    <div className="w-80 rounded-md border border-border bg-background shadow-md p-2">
      <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Recent uploads</div>
      <div className="space-y-1 max-h-64 overflow-auto">
        {err && <div className="px-3 py-2 text-xs text-destructive">{err}</div>}
        {!items && !err && <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>}
        {items && items.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No recent uploads</div>}
        {items && items.map((it) => (
          <Link key={it.id} to="/submissions/$id" params={{ id: it.id }} className="block px-3 py-2 hover:bg-muted/30 rounded-md">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.filename || "(untitled)"}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="size-3" />
                  <span>{new Date(it.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="ml-3">
                {it.filename ? <Badge className="text-xs">file</Badge> : <Badge variant="outline" className="text-xs">no file</Badge>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
