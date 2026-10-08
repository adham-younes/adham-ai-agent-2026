"use client";

import { ArrowUpRightIcon, ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkflowPipelineType } from "./workflow-runner";
import type { SavedRun } from "@/lib/platform/workflow-form";
import { RunHistory } from "./run-history";

export function WorkspaceWelcome({ composer, onOpenWorkflow, runs, loading, error, onSelectRun, onRefresh }: {
  readonly composer: ReactNode;
  readonly onOpenWorkflow: (id: WorkflowPipelineType) => void;
  readonly runs: readonly SavedRun[];
  readonly loading: boolean;
  readonly error?: string;
  readonly onSelectRun: (run: SavedRun) => void;
  readonly onRefresh: () => void;
}) {
  return (
    <section className="workspace-empty" aria-label="Start a task">
      <div className="welcome-inner">
        <div className="welcome-intro">
          <div className="welcome-copy"><div className="welcome-eyebrow"><span className="welcome-line" />A SPACE FOR CONSIDERED WORK</div><h1>Good work starts<br />with <em>clarity.</em></h1><p className="welcome-description">Shape a feature. Make a decision. Resolve an incident.<br className="hidden sm:block" /> Turn your context into work you can review.</p><a className="intro-link" href="#work-brief">Start with your own brief <ArrowRightIcon className="size-4" /></a></div>
          <div className="outcome-panel"><div className="outcome-panel-inner"><span className="eyebrow">CHOOSE A DELIVERABLE</span><p className="outcome-panel-title">A useful place<br />to begin.</p><div className="outcome-list">
            <button onClick={() => onOpenWorkflow("feature-delivery")} type="button"><span className="outcome-number">01</span><span><strong>Feature specification</strong><small>Scope, architecture & proposed code</small></span><ArrowUpRightIcon /></button>
            <button onClick={() => onOpenWorkflow("architecture-evaluation")} type="button"><span className="outcome-number">02</span><span><strong>Architecture decision</strong><small>Trade-offs & a decision record</small></span><ArrowUpRightIcon /></button>
            <button onClick={() => onOpenWorkflow("incident-response")} type="button"><span className="outcome-number">03</span><span><strong>Incident playbook</strong><small>Diagnosis & recovery recommendations</small></span><ArrowUpRightIcon /></button>
          </div><button className="all-outcomes" onClick={() => onOpenWorkflow("release-readiness")} type="button">Explore all seven outcomes <ArrowRightIcon className="size-4" /></button></div></div>
        </div>
        <div className="work-brief" id="work-brief"><div className="section-heading"><div><span className="eyebrow">WORK DIRECTLY WITH YOUR AGENT</span><h2>What's on your desk?</h2></div><span className="brief-context-hint">A clear outcome is a good beginning.</span></div><div className="welcome-composer">{composer}</div></div>
        <RunHistory runs={runs} loading={loading} error={error} onSelect={onSelectRun} onRefresh={onRefresh} />
        <p className="welcome-footnote">Your instructions and saved work follow this browser.<span className="footnote-separator">/</span>No sign-in required</p>
      </div>
    </section>
  );
}
