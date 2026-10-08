"use client";

import {
  ActivityIcon,
  Code2Icon,
  DatabaseIcon,
  GitBranchIcon,
  RocketIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";


export type WorkflowPipelineType =
  | "feature-delivery"
  | "database-engineering"
  | "code-audit-repair"
  | "release-readiness"
  | "architecture-evaluation"
  | "incident-response"
  | "continual-learning";

const WORKFLOWS = {
  "feature-delivery": {
    title: "Build a feature",
    description: "From requirements to implementation and verification.",
    placeholder: "Describe the feature, target user, and expected behavior...",
    icon: SparklesIcon,
  },
  "database-engineering": {
    title: "Database engineering",
    description: "Data design, performance, and access policies.",
    placeholder: "Describe entities, relationships, and access requirements...",
    icon: DatabaseIcon,
  },
  "code-audit-repair": {
    title: "Code audit & repair",
    description: "Find the root cause and deliver a verified fix.",
    placeholder: "Paste code or describe the file and the issue...",
    icon: Code2Icon,
  },
  "release-readiness": {
    title: "Release readiness",
    description: "Quality checks, deployment, and rollback planning.",
    placeholder: "Describe the release scope and target environment...",
    icon: RocketIcon,
  },
  "architecture-evaluation": {
    title: "Architecture review",
    description: "Compare alternatives and document the decision.",
    placeholder: "Describe the decision, alternatives, and constraints...",
    icon: GitBranchIcon,
  },
  "incident-response": {
    title: "Incident response",
    description: "Contain, diagnose, repair, and review the incident.",
    placeholder: "Describe impact, logs, and recent changes...",
    icon: ActivityIcon,
  },
  "continual-learning": {
    title: "Capture knowledge",
    description: "Turn past results into context-aware knowledge.",
    placeholder: "Describe the context, decision, result, and lesson learned...",
    icon: ShieldCheckIcon,
  },
} as const;

export function ExecutiveWorkflowsModal({
  initialPipeline,
  isOpen,
  onClose,
  onSendToChat,
}: {
  readonly initialPipeline: WorkflowPipelineType;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSendToChat: (text: string) => void;
}) {
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [details, setDetails] = useState("");

  useEffect(() => setPipeline(initialPipeline), [initialPipeline]);
  const workflow = WORKFLOWS[pipeline];
  const Icon = workflow.icon;
  const prompt = useMemo(
    () => `Execute the "${workflow.title}" workflow with the appropriate specialist agents.\n\n${details.trim()}`,
    [details, workflow.title],
  );

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="workflow-dialog border-white/10 bg-[#111214] p-0 text-zinc-100 sm:max-w-2xl">
        <div className="p-5 sm:p-7">
          <DialogHeader className="text-left">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-200">
              <Icon className="size-5" />
            </div>
            <DialogTitle className="text-xl">{workflow.title}</DialogTitle>
            <DialogDescription className="text-zinc-500">{workflow.description}</DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.entries(WORKFLOWS) as [WorkflowPipelineType, (typeof WORKFLOWS)[WorkflowPipelineType]][]).map(
              ([id, item]) => (
                <button
                  className={id === pipeline ? "workflow-choice workflow-choice-active" : "workflow-choice"}
                  key={id}
                  onClick={() => setPipeline(id)}
                  type="button"
                >
                  {item.title}
                </button>
              ),
            )}
          </div>

          <label className="mt-6 block text-xs font-medium text-zinc-400" htmlFor="workflow-details">
            Task details
          </label>
          <Textarea
            className="mt-2 min-h-40 resize-y border-white/10 bg-black/20 p-4 leading-7 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-500/40"
            id="workflow-details"
            onChange={(event) => setDetails(event.target.value)}
            placeholder={workflow.placeholder}
            value={details}
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-600">The coordinator selects the appropriate agents and tools.</p>
            <Button
              className="rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              disabled={!details.trim()}
              onClick={() => {
                onSendToChat(prompt);
                setDetails("");
                onClose();
              }}
            >
              Start task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
