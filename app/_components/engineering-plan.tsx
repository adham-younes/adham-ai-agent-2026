"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Task, RequiredCheck } from "@/lib/engineering/types";
import { engineeringRequest } from "./engineering-api";

export function EngineeringPlan({
  projectId,
  task,
  onSaved,
  onWork,
}: {
  projectId: string;
  task: Task;
  onSaved: () => void;
  onWork: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [criteria, setCriteria] = useState(task.acceptanceCriteria.join("\n"));
  const [artifacts, setArtifacts] = useState(task.requiredArtifacts.join("\n"));
  const [checks, setChecks] = useState<RequiredCheck[]>(task.requiredChecks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const frozen = Boolean(
    task.currentRunId || ["verified", "accepted"].includes(task.status),
  );
  useEffect(() => {
    setTitle(task.title);
    setCriteria(task.acceptanceCriteria.join("\n"));
    setArtifacts(task.requiredArtifacts.join("\n"));
    setChecks(task.requiredChecks);
  }, [task.id, task.version]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await engineeringRequest(
        `/api/projects/${projectId}/tasks/${task.id}`,
        "PATCH",
        {
          title,
          acceptanceCriteria: criteria
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          requiredArtifacts: artifacts
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          requiredChecks: checks,
        },
      );
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save plan.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="engineering-panel">
      <div className="engineering-section-heading">
        <h2>Task plan</h2>
        {task.status !== "draft" ? (
          <Button onClick={onWork} variant="outline">
            Open work
          </Button>
        ) : null}
      </div>
      <p className="engineering-muted">
        {frozen
          ? "The plan is frozen after execution starts. Create a new task to change its acceptance checks."
          : "Review the acceptance criteria, required files, and exact check commands before starting execution."}
      </p>
      <form
        className="engineering-form"
        onSubmit={(event) => {
          void save(event);
        }}
      >
        <label className="engineering-field">
          <span>Task title</span>
          <Input
            value={title}
            required
            maxLength={200}
            disabled={frozen}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="engineering-field">
          <span>Acceptance criteria (one per line)</span>
          <Textarea
            dir="auto"
            value={criteria}
            required
            rows={4}
            maxLength={20000}
            disabled={frozen}
            onChange={(event) => setCriteria(event.target.value)}
          />
        </label>
        <label className="engineering-field">
          <span>Required artifact paths (one per line)</span>
          <Textarea
            value={artifacts}
            rows={2}
            placeholder="src/example.ts"
            disabled={frozen}
            onChange={(event) => setArtifacts(event.target.value)}
          />
        </label>
        <fieldset className="engineering-check-editor" disabled={frozen}>
          <legend>Required checks</legend>
          <p className="engineering-muted">
            Enter commands that test the intended behavior in this project's
            workspace. IDs must use letters, digits, underscores, or hyphens.
          </p>
          {checks.map((check, index) => (
            <div className="engineering-check-row" key={index}>
              <label>
                <span>Check ID</span>
                <Input
                  aria-label={`Check ${index + 1} identifier`}
                  value={check.id}
                  required
                  pattern="[a-zA-Z0-9_-]{1,80}"
                  onChange={(event) =>
                    setChecks((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, id: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                <span>Command</span>
                <Input
                  aria-label={`Check ${index + 1} command`}
                  className="engineering-code-input"
                  value={check.command}
                  required
                  maxLength={2000}
                  placeholder="npm test -- --run"
                  onChange={(event) =>
                    setChecks((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, command: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  setChecks((current) => current.filter((_, i) => i !== index))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          {!frozen ? (
            <Button
              type="button"
              variant="outline"
              disabled={checks.length >= 20}
              onClick={() =>
                setChecks((current) => [
                  ...current,
                  { id: `check-${current.length + 1}`, command: "" },
                ])
              }
            >
              Add acceptance check
            </Button>
          ) : null}
        </fieldset>
        {error ? (
          <p role="alert" className="engineering-error">
            {error}
          </p>
        ) : null}
        {!frozen ? (
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save plan"}
          </Button>
        ) : null}
      </form>
    </section>
  );
}
