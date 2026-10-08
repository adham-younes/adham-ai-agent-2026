"use client";

import { useEveAgent } from "eve/react";
import type { UserContent } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentMessage } from "./agent-message";
import type { Project, Task } from "@/lib/engineering/types";
import { engineeringRequest } from "./engineering-api";

type Attachment = { name: string; data: string; size: number };

export function EngineeringChat({
  project,
  task,
  onRefresh,
  request,
  onRequestHandled,
}: {
  project: Project;
  task: Task;
  onRefresh: () => void;
  request?: string;
  onRequestHandled: () => void;
}) {
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string>();
  const scrollEnd = useRef<HTMLDivElement>(null);
  const [readingFiles, setReadingFiles] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const agent = useEveAgent({
    host: `?projectId=${encodeURIComponent(project.id)}&taskId=${encodeURIComponent(task.id)}`,
    initialSession: project.sessionId
      ? { sessionId: project.sessionId, streamIndex: 0 }
      : undefined,
    resume: Boolean(project.sessionId),
    onFinish: () => refresh.current(),
    onError: () => refresh.current(),
    onEvent: (event) => {
      if (
        ["turn.completed", "turn.failed", "turn.cancelled"].includes(event.type)
      )
        refresh.current();
    },
  });
  const busy = agent.status === "streaming" || agent.status === "submitted";
  const resuming = agent.status === "resuming";
  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ block: "nearest" });
  }, [agent.data.messages.length, agent.status]);
  useEffect(() => {
    if (!request || resuming || busy) return;
    onRequestHandled();
    setError(undefined);
    setDispatching(true);
    void engineeringRequest(
      `/api/projects/${project.id}/tasks/${task.id}`,
      "PATCH",
      { action: "activate" },
    )
      .then(() => agent.send(request))
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Could not send request.",
        ),
      )
      .finally(() => setDispatching(false));
  }, [request, resuming, busy, agent, onRequestHandled]);

  async function attach(selected: FileList | null) {
    if (!selected) return;
    setReadingFiles(true);
    setError(undefined);
    try {
      const added = Array.from(selected);
      if (files.length + added.length > 10)
        throw new Error("Attach at most 10 text files.");
      if (added.some((file) => file.size > 256 * 1024))
        throw new Error("Each text file must be 256 KiB or smaller.");
      if (
        files.reduce((sum, file) => sum + file.size, 0) +
          added.reduce((sum, file) => sum + file.size, 0) >
        1024 * 1024
      )
        throw new Error("Combined attachments must be 1 MiB or smaller.");
      const prepared: Attachment[] = [];
      for (const file of added) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.includes(0))
          throw new Error(
            `${file.name} appears to be binary. Attach text source files only.`,
          );
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error(`Could not read ${file.name}.`));
          reader.readAsDataURL(new Blob([bytes], { type: "text/plain" }));
        });
        prepared.push({ name: file.name, size: file.size, data });
      }
      setFiles((current) => [...current, ...prepared]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The attachments must contain valid UTF-8 text.",
      );
    } finally {
      setReadingFiles(false);
    }
  }

  async function send() {
    if (
      busy ||
      resuming ||
      dispatching ||
      readingFiles ||
      (!text.trim() && !files.length)
    )
      return;
    setError(undefined);
    const parts: UserContent = [];
    const importInstruction = files.length
      ? "\nThe attached text files are authorized project input. Use engineering_import with their staged /workspace/attachments/ source paths and relative destination names before editing them. Report any unsupported import instead of claiming it succeeded."
      : "";
    parts.push({
      type: "text",
      text:
        (text.trim() || "Import these source files into the project.") +
        importInstruction,
    });
    for (const file of files)
      parts.push({
        type: "file",
        filename: file.name,
        mediaType: "text/plain",
        data: file.data,
      });
    try {
      setDispatching(true);
      await engineeringRequest(
        `/api/projects/${project.id}/tasks/${task.id}`,
        "PATCH",
        { action: "activate" },
      );
      await agent.send(parts);
      setText("");
      setFiles([]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send your message.",
      );
    } finally {
      setDispatching(false);
    }
  }

  const terminal = [...agent.events]
    .reverse()
    .find((event) =>
      ["turn.failed", "turn.completed", "turn.cancelled"].includes(event.type),
    );
  const failure = terminal?.type === "turn.failed";
  return (
    <section className="engineering-chat" aria-label="Task conversation">
      <div
        className="engineering-messages"
        aria-live="polite"
        aria-busy={busy || resuming}
      >
        {resuming ? (
          <p className="engineering-muted">Restoring project conversation…</p>
        ) : null}
        {!resuming && !agent.data.messages.length ? (
          <div className="engineering-empty">
            <h2>Work on this task</h2>
            <p>
              Describe the change or ask the agent to carry out the approved
              plan. Execution, published files, and checks appear in the task
              ledger.
            </p>
          </div>
        ) : null}
        {agent.data.messages.map((message, index) => (
          <AgentMessage
            key={message.id}
            message={message}
            canRespond={!busy && !resuming}
            isStreaming={
              agent.status === "streaming" &&
              index === agent.data.messages.length - 1
            }
            onInputResponses={(responses) => agent.respond(responses)}
          />
        ))}
        {busy ? (
          <p className="engineering-muted">
            Agent is working. Task status follows recorded execution evidence.
          </p>
        ) : null}
        {error || agent.error || (!busy && failure) ? (
          <p className="engineering-error" role="alert">
            {error ??
              agent.error?.message ??
              "The last response failed. Review the execution records before retrying."}
          </p>
        ) : null}
        <div ref={scrollEnd} />
      </div>
      <form
        className="engineering-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <Textarea
          aria-label="Message for this task"
          dir="auto"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Describe the change, provide context, or request checks…"
          disabled={resuming || busy || dispatching}
          rows={3}
        />
        {files.length ? (
          <div className="engineering-attachments">
            {files.map((file, index) => (
              <Button
                key={`${file.name}-${index}`}
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  setFiles((current) => current.filter((_, i) => i !== index))
                }
              >
                Remove {file.name}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="engineering-toolbar">
          <label className="engineering-attach">
            {readingFiles ? "Reading files…" : "Attach text files"}
            <input
              aria-label="Attach text source files"
              type="file"
              multiple
              disabled={resuming || busy || dispatching || readingFiles}
              onChange={(event) => {
                void attach(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <span className="engineering-muted">10 files · 256 KiB each</span>
          {busy ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void agent
                  .cancel()
                  .then(() => refresh.current())
                  .catch((cause: unknown) =>
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Cancellation could not be confirmed.",
                    ),
                  );
              }}
            >
              Cancel execution
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={
                resuming ||
                dispatching ||
                readingFiles ||
                (!text.trim() && !files.length)
              }
            >
              Send message
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
