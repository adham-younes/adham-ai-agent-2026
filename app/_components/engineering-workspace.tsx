"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  FolderDuotoneIcon,
  FolderOpenDuotoneIcon,
  TerminalDuotoneIcon,
  CheckDuotoneIcon,
  FileDuotoneIcon,
} from "@/components/icons";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import type {
  Project,
  Task,
  Artifact,
  Check,
  EngineeringRun,
} from "@/lib/engineering/types";
import { engineeringRequest, displayStatus } from "./engineering-api";
import { EngineeringChat } from "./engineering-chat";
import { EngineeringPlan } from "./engineering-plan";
import { AgentSettingsDialog } from "./agent-settings-dialog";

type ProjectPage = {
  project: Project;
  tasks: Task[];
  nextOffset: number | null;
};
type TaskPage = {
  task: Task;
  runs: EngineeringRun[];
  artifacts: Artifact[];
  checks: Check[];
  checkSummary: Record<
    string,
    Omit<
      Pick<
        Check,
        | "status"
        | "workspaceVersion"
        | "exitCode"
        | "createdAt"
        | "logs"
        | "command"
      >,
      "status"
    > & { status: Check["status"] | "running" }
  >;
};

export function EngineeringWorkspace({
  projectId,
  taskId,
}: {
  projectId?: string;
  taskId?: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectData, setProjectData] = useState<ProjectPage>();
  const [taskData, setTaskData] = useState<TaskPage>();
  const [offset, setOffset] = useState(0);
  const [evidenceOffset, setEvidenceOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(false);
  const [capabilities, setCapabilities] = useState(false);
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  const [tab, setTab] = useState("plan");
  const [chatRequest, setChatRequest] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<Artifact>();
  const [mobileNav, setMobileNav] = useState(false);
  const refresh = useCallback(async () => {
    setError(undefined);
    try {
      if (!projectId) {
        const result = await engineeringRequest<{
          projects: Project[];
          nextOffset: number | null;
        }>(`/api/projects?limit=5&offset=${offset}`);
        setProjects(result.projects);
        setNextOffset(result.nextOffset);
      } else {
        const result = await engineeringRequest<ProjectPage>(
          `/api/projects/${projectId}?limit=5&offset=${offset}`,
        );
        setProjectData(result);
        setNextOffset(result.nextOffset);
        if (taskId)
          setTaskData(
            await engineeringRequest<TaskPage>(
              `/api/projects/${projectId}/tasks/${taskId}?limit=5&offset=${evidenceOffset}`,
            ),
          );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load project records.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, offset, evidenceOffset]);
  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (taskData?.task.status !== "running") return;
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [taskData?.task.status, refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    try {
      if (projectId) {
        const result = await engineeringRequest<{ task: Task }>(
          `/api/projects/${projectId}/tasks`,
          "POST",
          {
            title: String(form.get("title")),
            kind: form.get("kind"),
            acceptanceCriteria: String(form.get("criteria"))
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            requiredChecks: [],
            requiredArtifacts: [],
          },
        );
        router.push(`/projects/${projectId}/tasks/${result.task.id}`);
      } else {
        const result = await engineeringRequest<{ project: Project }>(
          "/api/projects",
          "POST",
          {
            name: String(form.get("name")),
            goal: String(form.get("goal")),
            stack: String(form.get("stack")),
            source: String(form.get("source")),
          },
        );
        router.push(`/projects/${result.project.id}`);
      }
      setCreating(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create record.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function taskAction(action: "verify" | "accept" | "activate") {
    if (!taskId || !projectId) return;
    setSaving(true);
    setError(undefined);
    try {
      await engineeringRequest(
        `/api/projects/${projectId}/tasks/${taskId}`,
        "PATCH",
        { action },
      );
      await refresh();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The action could not be completed.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  const handleRequest = useCallback(() => setChatRequest(undefined), []);
  const project = projectData?.project;
  const task = taskData?.task;
  const canWork = Boolean(
    task && (task.status !== "draft" || task.kind === "analysis"),
  );
  function runChecks() {
    setChatRequest(
      "Run engineering_check for this task using every owner-configured required check. Record the actual commands, exit codes, logs, and current workspace revision. Do not change the approved commands. Report failures accurately.",
    );
    setEvidenceOffset(0);
    setTab("work");
  }

  return (
    <div className="engineering-shell">
      <Sidebar
        className={`engineering-sidebar ${mobileNav ? "engineering-sidebar-open" : ""}`}
      >
        <SidebarHeader>
          <span className="engineering-brand">ADHAM</span>
          <span className="engineering-muted">Engineering</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarItem
              active={!projectId}
              icon={<FolderDuotoneIcon />}
              onClick={() => router.push("/")}
            >
              Projects
            </SidebarItem>
          </SidebarGroup>
          {project ? (
            <SidebarGroup>
              <SidebarGroupLabel>Current project</SidebarGroupLabel>
              <SidebarItem
                active={!taskId}
                icon={<FolderOpenDuotoneIcon />}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                {project.name}
              </SidebarItem>
              {projectData?.tasks.map((item) => (
                <SidebarItem
                  key={item.id}
                  active={taskId === item.id}
                  icon={<TerminalDuotoneIcon />}
                  onClick={() => {
                    router.push(`/projects/${project.id}/tasks/${item.id}`);
                    setMobileNav(false);
                  }}
                >
                  {item.title}
                </SidebarItem>
              ))}
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <SidebarItem
            icon={<FolderOpenDuotoneIcon />}
            onClick={() => setWorkspaceMenu(true)}
          >
            Workspace menu
          </SidebarItem>
          <p className="engineering-privacy">Private to this browser.</p>
        </SidebarFooter>
      </Sidebar>
      <main className="engineering-main">
        <header className="engineering-topbar">
          <Button
            className="engineering-mobile-toggle"
            variant="outline"
            onClick={() => setMobileNav((value) => !value)}
            aria-expanded={mobileNav}
          >
            Navigation
          </Button>
          <nav aria-label="Breadcrumb">
            {projectId ? <Link href="/">Projects</Link> : <span>Projects</span>}
            {project ? (
              <>
                <span>/</span>
                <Link href={`/projects/${project.id}`}>{project.name}</Link>
              </>
            ) : null}
            {task ? (
              <>
                <span>/</span>
                <span aria-current="page">{task.title}</span>
              </>
            ) : null}
          </nav>
          {projectId ? (
            <Button
              variant="ghost"
              onClick={() => {
                void refresh();
              }}
              disabled={loading}
            >
              Refresh
            </Button>
          ) : null}
        </header>
        <div className="engineering-content">
          <div className="engineering-heading">
            <div>
              {!projectId ? (
                <h1>Engineering projects</h1>
              ) : (
                <h1 dir="auto">
                  {task?.title ?? project?.name ?? "Loading project…"}
                </h1>
              )}
              <p dir="auto">
                {task
                  ? `Revision ${project?.workspaceVersion ?? 0} · ${task.kind === "analysis" ? "Analysis and report" : "Implementation"}`
                  : (project?.goal ??
                    "Plan, build, and verify software projects.")}
              </p>
            </div>
            {!projectId ? (
              <Button onClick={() => setCreating(true)}>New project</Button>
            ) : task ? (
              <Badge variant="outline">{displayStatus(task.status)}</Badge>
            ) : (
              <Button
                onClick={() => setCreating(true)}
                disabled={Boolean(projectId && !project)}
              >
                New task
              </Button>
            )}
          </div>
          {error ? (
            <div role="alert" className="engineering-error">
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refresh();
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {loading && !project && !projects.length ? (
            <p className="engineering-muted" role="status">
              Loading project records…
            </p>
          ) : null}
          {!projectId && !loading ? (
            <section className="engineering-panel">
              <h2>Recent projects</h2>
              {projects.length > 0 ? (
                <StatCard
                  className="engineering-page-count"
                  label="Projects on this page"
                  value={projects.length}
                />
              ) : null}
              {projects.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Revision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link
                            className="engineering-record-link"
                            href={`/projects/${item.id}`}
                          >
                            <FolderDuotoneIcon />
                            {item.name}
                          </Link>
                          <p className="engineering-muted" dir="auto">
                            {item.goal}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {displayStatus(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.workspaceVersion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : !error ? (
                <Empty title="No projects yet." />
              ) : null}
              <Pagination
                offset={offset}
                nextOffset={nextOffset}
                onChange={setOffset}
              />
            </section>
          ) : null}
          {project && !taskId ? (
            <>
              <section className="engineering-context">
                <div>
                  <span>Stack</span>
                  <p>{project.stack || "Not specified"}</p>
                </div>
                <div>
                  <span>Source</span>
                  <p dir="auto">
                    {project.source ||
                      "Start from a brief or attach text source files in a task."}
                  </p>
                </div>
              </section>
              <section className="engineering-panel">
                <h2>Tasks</h2>
                {projectData.tasks.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead>Phase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectData.tasks.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Link
                              className="engineering-record-link"
                              href={`/projects/${project.id}/tasks/${item.id}`}
                            >
                              {item.title}
                            </Link>
                          </TableCell>
                          <TableCell>{item.kind}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {displayStatus(item.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Empty title="Define the first task">
                    Break the project into an implementation or analysis task
                    with clear acceptance criteria.
                  </Empty>
                )}
                <Pagination
                  offset={offset}
                  nextOffset={nextOffset}
                  onChange={setOffset}
                />
              </section>
            </>
          ) : null}
          {project && task && taskData ? (
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setEvidenceOffset(0);
                setTab(value);
              }}
              className="engineering-task-tabs"
            >
              <TabsList aria-label="Task views">
                <TabsTrigger value="plan">Plan</TabsTrigger>
                <TabsTrigger value="work">Work</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="checks">Checks</TabsTrigger>
              </TabsList>
              <TabsContent value="plan">
                <EngineeringPlan
                  projectId={project.id}
                  task={task}
                  onSaved={() => {
                    void refresh();
                  }}
                  onWork={() => {
                    void taskAction("activate").then((activated) => {
                      if (activated) {
                        setEvidenceOffset(0);
                        setTab("work");
                      }
                    });
                  }}
                />
                <p className="engineering-muted">
                  Next action:{" "}
                  {task.status === "draft"
                    ? "review and save acceptance criteria and required checks."
                    : task.status === "verified" || task.status === "accepted"
                      ? "review the recorded result and create a new task for further changes."
                      : task.status === "running"
                        ? "follow execution in Work; checks remain tied to the source revision."
                        : "carry out the plan in Work, then review files and checks."}
                </p>
              </TabsContent>
              <TabsContent value="work" forceMount hidden={tab !== "work"}>
                {canWork ? (
                  <EngineeringChat
                    key={`${project.id}:${task.id}`}
                    project={project}
                    task={task}
                    onRefresh={() => {
                      void refresh();
                    }}
                    request={chatRequest}
                    onRequestHandled={handleRequest}
                  />
                ) : (
                  <Empty title="Review the task plan first">
                    Save meaningful required checks before starting
                    implementation.
                  </Empty>
                )}
                <ExecutionHistory runs={taskData.runs} />
                <Pagination
                  offset={evidenceOffset}
                  nextOffset={
                    taskData.runs.length === 5 ? evidenceOffset + 5 : null
                  }
                  onChange={setEvidenceOffset}
                />
              </TabsContent>
              <TabsContent value="files">
                <section className="engineering-panel">
                  <h2>Published files</h2>
                  <p className="engineering-muted">
                    Only files actually published by execution appear here.
                  </p>
                  {taskData.artifacts.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead>Revision</TableHead>
                          <TableHead>
                            <span className="sr-only">Open</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taskData.artifacts.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell>
                              <span className="engineering-record-link engineering-path">
                                <FileDuotoneIcon />
                                {file.path}
                              </span>
                            </TableCell>
                            <TableCell>{file.kind}</TableCell>
                            <TableCell>{file.workspaceVersion}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedFile(file)}
                              >
                                View file
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Empty title="No published files">
                      Ask the agent to publish changed source files or a
                      supported source archive after executing the task.
                    </Empty>
                  )}
                  <Pagination
                    offset={evidenceOffset}
                    nextOffset={
                      taskData.artifacts.length === 5
                        ? evidenceOffset + 5
                        : null
                    }
                    onChange={setEvidenceOffset}
                  />
                </section>
              </TabsContent>
              <TabsContent value="checks">
                <section className="engineering-panel">
                  <div className="engineering-section-heading">
                    <h2>Acceptance checks</h2>
                    {task.kind === "implementation" ? (
                      <Button
                        onClick={runChecks}
                        disabled={
                          !canWork ||
                          !task.requiredChecks.length ||
                          task.status === "running" ||
                          saving
                        }
                      >
                        Run configured checks
                      </Button>
                    ) : null}
                  </div>
                  <p className="engineering-muted">
                    Passing checks apply to the named command and source
                    revision.
                  </p>
                  {task.requiredChecks.length ? (
                    task.requiredChecks.map((required) => {
                      const result = taskData.checkSummary?.[required.id];
                      return (
                        <article
                          className="engineering-check"
                          key={required.id}
                        >
                          <div>
                            <CheckDuotoneIcon />
                            <strong>{required.id}</strong>
                            <Badge variant="outline">
                              {result?.status ??
                                (task.status === "running"
                                  ? "Awaiting result"
                                  : "Pending")}
                            </Badge>
                          </div>
                          <code dir="ltr">{required.command}</code>
                          {result ? (
                            <>
                              <p className="engineering-muted">
                                Revision {result.workspaceVersion} · Exit{" "}
                                {result.exitCode ?? "unavailable"} ·{" "}
                                {new Date(result.createdAt).toLocaleString()}
                              </p>
                              <details>
                                <summary>View check log</summary>
                                <pre>
                                  {result.logs || "No output recorded."}
                                </pre>
                              </details>
                            </>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <Empty
                      title={
                        task.kind === "analysis"
                          ? "Report acceptance"
                          : "No checks configured"
                      }
                    >
                      {task.kind === "analysis"
                        ? "Review the report before accepting it. Report acceptance does not certify test results."
                        : "Configure meaningful acceptance commands in Plan before execution."}
                    </Empty>
                  )}
                  <div className="engineering-toolbar">
                    <Button
                      variant="outline"
                      onClick={() => {
                        void taskAction(
                          task.kind === "analysis" ? "accept" : "verify",
                        );
                      }}
                      disabled={
                        saving ||
                        ["draft", "running", "verified", "accepted"].includes(
                          task.status,
                        )
                      }
                    >
                      {task.kind === "analysis"
                        ? "Accept report"
                        : "Verify current revision"}
                    </Button>
                    <span className="engineering-muted">
                      The server validates all required evidence.
                    </span>
                  </div>
                  {taskData.checks.length ? (
                    <details>
                      <summary>Recorded check history</summary>
                      {taskData.checks.map((check) => (
                        <div className="engineering-check" key={check.id}>
                          <strong>
                            {check.checkId} · {check.status}
                          </strong>
                          <p>
                            Revision {check.workspaceVersion} · Exit{" "}
                            {check.exitCode ?? "unavailable"}
                          </p>
                          <code>{check.command}</code>
                          <pre>{check.logs || "No output recorded."}</pre>
                        </div>
                      ))}
                      <Pagination
                        offset={evidenceOffset}
                        nextOffset={
                          taskData.checks.length === 5
                            ? evidenceOffset + 5
                            : null
                        }
                        onChange={setEvidenceOffset}
                      />
                    </details>
                  ) : null}
                </section>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </main>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="engineering-dialog">
          <DialogHeader>
            <DialogTitle>{projectId ? "New task" : "New project"}</DialogTitle>
            <DialogDescription>
              {projectId
                ? "Define the outcome. Review required checks in the task plan before execution."
                : "Set the goal and technical context for a durable project workspace."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              void create(event);
            }}
            className="engineering-form"
          >
            {projectId ? (
              <>
                <Field label="Task title">
                  <Input name="title" required maxLength={200} />
                </Field>
                <Field label="Task kind">
                  <select name="kind" className="engineering-select">
                    <option value="implementation">Implementation</option>
                    <option value="analysis">Analysis</option>
                  </select>
                </Field>
                <Field label="Acceptance criteria (one per line)">
                  <Textarea
                    name="criteria"
                    required
                    rows={4}
                    maxLength={10000}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Project name">
                  <Input name="name" required maxLength={160} />
                </Field>
                <Field label="Project goal">
                  <Textarea name="goal" required rows={4} maxLength={10000} />
                </Field>
                <Field label="Stack (optional)">
                  <Input
                    name="stack"
                    placeholder="Languages, framework, runtime"
                    maxLength={2000}
                  />
                </Field>
                <Field label="Source context (optional)">
                  <Input
                    name="source"
                    placeholder="Repository URL or starting context"
                    maxLength={2000}
                  />
                </Field>
              </>
            )}
            {error ? (
              <p role="alert" className="engineering-error">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving
                ? "Creating…"
                : projectId
                  ? "Create task"
                  : "Create project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedFile)}
        onOpenChange={(open) => {
          if (!open) setSelectedFile(undefined);
        }}
      >
        <DialogContent className="engineering-file-dialog">
          <DialogHeader>
            <DialogTitle className="engineering-path">
              {selectedFile?.path}
            </DialogTitle>
            <DialogDescription>
              Published {selectedFile?.kind} · Revision{" "}
              {selectedFile?.workspaceVersion}
            </DialogDescription>
          </DialogHeader>
          {selectedFile ? (
            <>
              <Button
                onClick={() => downloadArtifact(selectedFile)}
                variant="outline"
              >
                Download file
              </Button>
              {selectedFile.kind.includes("archive") ? (
                <p>This source archive is available as a download.</p>
              ) : (
                <pre dir="ltr">{selectedFile.content}</pre>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={workspaceMenu} onOpenChange={setWorkspaceMenu}>
        <DialogContent className="engineering-dialog">
          <DialogHeader>
            <DialogTitle>Workspace menu</DialogTitle>
            <DialogDescription>
              Tools, preferences, and saved conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="engineering-form">
            <Button
              variant="outline"
              onClick={() => {
                setWorkspaceMenu(false);
                setCapabilities(true);
              }}
            >
              Capabilities
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setWorkspaceMenu(false);
                setSettings(true);
              }}
            >
              Settings & memory
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setWorkspaceMenu(false);
                router.push("/s");
              }}
            >
              Legacy conversations
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={capabilities} onOpenChange={setCapabilities}>
        <DialogContent className="engineering-dialog">
          <DialogHeader>
            <DialogTitle>Engineering capabilities</DialogTitle>
            <DialogDescription>
              Execution availability requires a bound project, sandbox, and
              durable storage. Errors are reported by the actual operation.
            </DialogDescription>
          </DialogHeader>
          <div className="engineering-capabilities">
            {[
              [
                "Understand",
                "Inspect source and analyze requirements in task chat.",
                "Analysis",
              ],
              [
                "Design",
                "Draft plans, architecture, and review notes from your brief.",
                "Draft for review",
              ],
              [
                "Build",
                "Import bounded text input and execute source changes in the project sandbox.",
                "Real sandbox execution",
              ],
              [
                "Verify",
                "Run owner-configured commands and retain exit codes, logs, and revisions.",
                "Recorded checks",
              ],
              [
                "Deliver",
                "Publish real text files and bounded source archives.",
                "Downloadable artifacts",
              ],
            ].map(([name, description, output]) => (
              <article key={name}>
                <h2>{name}</h2>
                <p>{description}</p>
                <Badge variant="outline">{output}</Badge>
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <AgentSettingsDialog open={settings} onOpenChange={setSettings} />
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="engineering-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="engineering-empty">
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
function Pagination({
  offset,
  nextOffset,
  onChange,
}: {
  offset: number;
  nextOffset: number | null;
  onChange: (offset: number) => void;
}) {
  return offset > 0 || nextOffset !== null ? (
    <div className="engineering-pagination">
      <Button
        size="sm"
        variant="outline"
        disabled={!offset}
        onClick={() => onChange(Math.max(0, offset - 5))}
      >
        Previous
      </Button>
      <span>Page {offset / 5 + 1}</span>
      <Button
        size="sm"
        variant="outline"
        disabled={nextOffset === null}
        onClick={() => {
          if (nextOffset !== null) onChange(nextOffset);
        }}
      >
        Next
      </Button>
    </div>
  ) : null;
}
function ExecutionHistory({ runs }: { runs: EngineeringRun[] }) {
  return (
    <details className="engineering-panel">
      <summary>Execution activity ({runs.length} on this page)</summary>
      {runs.length ? (
        runs.map((run) => (
          <article className="engineering-check" key={run.id}>
            <div>
              <TerminalDuotoneIcon />
              <strong>{run.capability}</strong>
              <Badge variant="outline">{run.status}</Badge>
            </div>
            <p className="engineering-muted">
              Revision {run.workspaceVersion} ·{" "}
              {new Date(run.createdAt).toLocaleString()}{" "}
              {run.exitCode !== null ? `· Exit ${run.exitCode}` : ""}
            </p>
            {run.command ? <code>{run.command}</code> : null}
            {run.error ? (
              <p className="engineering-error">{run.error}</p>
            ) : null}
            {run.logs ? <pre>{run.logs}</pre> : null}
          </article>
        ))
      ) : (
        <p className="engineering-muted">No execution attempts recorded.</p>
      )}
    </details>
  );
}
function downloadArtifact(file: Artifact) {
  const archive = file.kind.includes("archive");
  const bytes = archive
    ? Uint8Array.from(atob(file.content), (char) => char.charCodeAt(0))
    : file.content;
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: archive ? "application/zip" : "text/plain;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = file.path.split("/").at(-1) || "artifact";
  link.click();
  URL.revokeObjectURL(url);
}

export default EngineeringWorkspace;
