"use client";

import { BrainIcon, CheckIcon, Loader2Icon, SlidersHorizontalIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Settings {
  readonly systemPrompt: string;
  readonly memoryEnabled: boolean;
}

export function AgentSettingsDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [settings, setSettings] = useState<Settings>();
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setState("loading");
    void fetch("/api/settings", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("settings unavailable");
        const value = (await response.json()) as Settings;
        setSettings(value);
        setDraft(value.systemPrompt);
        setState("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [open]);

  async function save() {
    if (!settings || !draft.trim()) return;
    setState("saving");
    const response = await fetch("/api/settings", {
      body: JSON.stringify({ memoryEnabled: settings.memoryEnabled, systemPrompt: draft.trim() }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    }).catch(() => undefined);
    if (!response?.ok) {
      setState("error");
      return;
    }
    const value = (await response.json()) as Settings;
    setSettings(value);
    setDraft(value.systemPrompt);
    setState("saved");
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="border-white/10 bg-[#111214] p-6 text-zinc-100 sm:max-w-xl">
        <DialogHeader className="text-right">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/[0.06]">
            <SlidersHorizontalIcon className="size-5" />
          </div>
          <DialogTitle>إعدادات الوكيل</DialogTitle>
          <DialogDescription className="text-zinc-500">
            تعليماتك الدائمة تُطبّق على الجلسات الجديدة وتبقى خاصة بحسابك.
          </DialogDescription>
        </DialogHeader>

        {state === "loading" ? (
          <div className="flex h-48 items-center justify-center text-zinc-500">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <label className="mt-5 block text-xs font-medium text-zinc-400" htmlFor="system-prompt">
              تعليمات النظام
            </label>
            <Textarea
              className="mt-2 min-h-48 resize-y border-white/10 bg-black/20 p-4 leading-7 text-zinc-100 placeholder:text-zinc-600"
              id="system-prompt"
              maxLength={8000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="مثال: أجب بإيجاز، وتحقق من المصادر قبل تقديم أي معلومة حديثة..."
              value={draft}
            />
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-3">
              <BrainIcon className="size-4 text-violet-300" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-zinc-300">ذاكرة طويلة المدى</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">مفعّلة ومفصولة حسب حساب المستخدم.</p>
              </div>
              <span className="size-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className={state === "error" ? "text-xs text-rose-400" : "text-xs text-zinc-600"} role="status">
                {state === "error" ? "تعذر الحفظ. حاول مجدداً." : `${draft.length.toLocaleString("ar-EG")} / ٨٬٠٠٠`}
              </p>
              <Button
                className="rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white"
                disabled={!draft.trim() || state === "saving"}
                onClick={() => void save()}
              >
                {state === "saving" ? <Loader2Icon className="size-4 animate-spin" /> : state === "saved" ? <CheckIcon className="size-4" /> : null}
                {state === "saving" ? "جارٍ الحفظ" : state === "saved" ? "تم الحفظ" : "حفظ الإعدادات"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
