"use client";

import { BotIcon, CpuIcon, LogOutIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

const AGENT_NAME = "adham-ai-agent-2026";

export function SignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signIn.social({
        callbackURL: "/",
        provider: "vercel",
      });
      if (!result.error) return;
      setPending(false);
      setError("فشل تسجيل الدخول. يرجى المحاولة مجددًا.");
    } catch {
      setPending(false);
      setError("فشل تسجيل الدخول. يرجى المحاولة مجددًا.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="relative flex w-full max-w-sm flex-col items-center rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 size-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
          <CpuIcon className="size-7" />
          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-zinc-950 border border-emerald-500/40 text-[9px] font-bold text-emerald-400">
            ⚡
          </span>
        </div>

        {/* Title & Status */}
        <div className="flex flex-col gap-1.5 mb-6">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-bold text-xl tracking-tight text-zinc-100">adham.ai</h1>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
              EXECUTIVE
            </span>
          </div>
          <p className="text-xs text-zinc-400">منظومة الوكلاء الذكية متعددة النماذج (120B + 2×27B)</p>
          <div className="mt-2 inline-flex items-center justify-center gap-2 self-center rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs text-zinc-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium">Groq LPU جاهز للعمل</span>
          </div>
        </div>

        {/* Sign In Button */}
        <Button
          className="w-full gap-2.5 rounded-xl bg-zinc-100 font-medium text-sm text-zinc-950 hover:bg-zinc-200 transition-colors py-5"
          disabled={pending}
          onClick={signIn}
        >
          <svg aria-hidden="true" className="size-3.5 fill-current" viewBox="0 0 24 20">
            <path d="M12 0 24 20H0L12 0Z" />
          </svg>
          <span>{pending ? "جاري التحويل..." : "الدخول عبر Vercel"}</span>
        </Button>

        {error ? (
          <p className="mt-3 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheckIcon className="size-3.5 text-emerald-500" />
          <span>جلسة عمل مشفرة ومؤمنة بالكامل</span>
        </div>
      </div>
    </main>
  );
}

function EveWordmark({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 169 53"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M169 8.47h-51.39L81.73 53H70.36L113 0H169zM169 44.51v8.47h-45.87V44.5zM45.87 52.98H0V44.5h45.87zM38.66 30.55H0v-8.47h38.66z"
        fill="currentColor"
      />
      <path d="M169 30.55h-38.66v-8.47H169zM75.52 8.47H0V0h75.52z" fill="currentColor" />
    </svg>
  );
}

export function AccountControl({
  email,
  image,
  name,
}: {
  readonly email: string;
  readonly image?: string | null;
  readonly name: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const initials = getInitials(name, email);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onError: () => setPending(false),
          onSuccess: () => window.location.assign("/"),
        },
      });
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="fixed top-3 left-4 z-30 flex h-8 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open account menu for ${name}`}
            className="relative size-7 cursor-pointer overflow-hidden rounded-full p-0"
            size="icon-sm"
            variant="ghost"
          >
            {image && !imageFailed ? (
              <img
                alt=""
                className="size-full object-cover"
                onError={() => setImageFailed(true)}
                src={image}
              />
            ) : (
              <span aria-hidden="true" className="font-medium text-xs">
                {initials}
              </span>
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-black/20 dark:border-white/25"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="min-w-0 px-2 py-1.5 text-sm">
            <span className="block truncate font-medium leading-5" title={name}>
              {name}
            </span>
            <span className="block truncate text-muted-foreground leading-5" title={email}>
              {email}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer justify-between"
            disabled={pending}
            onSelect={signOut}
          >
            {pending ? "Logging out…" : "Log out"}
            <LogOutIcon aria-hidden="true" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? email[0] ?? "?").toUpperCase();
}
