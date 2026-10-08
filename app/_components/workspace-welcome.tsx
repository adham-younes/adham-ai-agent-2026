"use client";

import { ArrowUpRightIcon, Code2Icon, GitBranchIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkflowPipelineType } from "./executive-workflows-modal";

export function WorkspaceWelcome({ composer, onOpenWorkflow, onPrompt }: {
  readonly composer: ReactNode;
  readonly onOpenWorkflow: (id: WorkflowPipelineType) => void;
  readonly onPrompt: (text: string) => void;
}) {
  return (
    <section className="workspace-empty" aria-label="Start a task">
      <div className="welcome-inner">
        <div className="welcome-eyebrow"><span className="welcome-line" />YOUR SPACE TO MAKE THINGS HAPPEN</div>
        <h1>Think clearly.<br /><span>Build with intent.</span></h1>
        <p className="welcome-description">A focused workspace for your ideas, your code, and everything that comes next.</p>
        <div className="welcome-composer">{composer}</div>
        <div className="suggestions-heading"><span>A place to start</span><span>OR BRING YOUR OWN IDEA</span></div>
        <div className="welcome-suggestions">
          <button onClick={() => onOpenWorkflow("feature-delivery")} type="button"><span className="suggestion-icon"><Code2Icon /></span><span><strong>Build something new</strong><small>From the first idea to working code</small></span><ArrowUpRightIcon /></button>
          <button onClick={() => onPrompt("Research a topic with current sources. Ask me which topic and what I want to learn before you start.")} type="button"><span className="suggestion-icon"><SearchIcon /></span><span><strong>Explore a question</strong><small>Research, compare, and find clarity</small></span><ArrowUpRightIcon /></button>
          <button onClick={() => onOpenWorkflow("architecture-evaluation")} type="button"><span className="suggestion-icon"><GitBranchIcon /></span><span><strong>Find a better approach</strong><small>Review a system and its tradeoffs</small></span><ArrowUpRightIcon /></button>
        </div>
        <p className="welcome-footnote"><span className="status-dot" />Open workspace<span className="footnote-separator">/</span>No account needed</p>
      </div>
    </section>
  );
}
