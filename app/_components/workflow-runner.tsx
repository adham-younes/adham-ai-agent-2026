"use client";
import { ArrowRightIcon, CheckIcon, DownloadIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageResponse } from '@/components/ai-elements/message';
import { buildWorkflowInput, resultSections, workflowForms, type OutcomeId, type SavedRun } from '@/lib/platform/workflow-form';

export type WorkflowPipelineType = OutcomeId;
export function ExecutiveWorkflowsModal({ initialPipeline, isOpen, onClose, onRunSaved, selectedRunId }: { readonly initialPipeline: OutcomeId; readonly isOpen: boolean; readonly onClose: () => void; readonly onRunSaved: () => void; readonly selectedRunId?: string }) {
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<'brief' | 'loading' | 'running' | 'result'>('brief');
  const [run, setRun] = useState<SavedRun>();
  const [error, setError] = useState<string>();
  const requestKey = useRef<string | undefined>(undefined);
  const requestFingerprint = useRef('');
  const savedCallback = useRef(onRunSaved);
  const viewGeneration = useRef(0);
  savedCallback.current = onRunSaved;
  useEffect(() => { viewGeneration.current += 1; }, [isOpen, initialPipeline, selectedRunId]);
  useEffect(() => {
    if (!isOpen || selectedRunId) return;
    setPipeline(initialPipeline);
    setState('brief'); setRun(undefined); setError(undefined);
  }, [initialPipeline, isOpen, selectedRunId]);
  useEffect(() => {
    if (!isOpen || !selectedRunId) return;
    const controller = new AbortController();
    setState('loading'); setError(undefined);
    void fetch(`/api/executive-workflows?runId=${encodeURIComponent(selectedRunId)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 404 ? 'This deliverable is not available in your workspace.' : 'Could not load this deliverable.');
      const data = await response.json() as { run: SavedRun };
      setRun(data.run); setPipeline(data.run.workflowId); setState(data.run.status === 'running' ? 'running' : 'result');
    }).catch(cause => { if (!controller.signal.aborted) { setError(cause.message); setState('result'); } });
    return () => controller.abort();
  }, [isOpen, selectedRunId]);
  useEffect(() => {
    if (state !== 'running' || !run?.id) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      void fetch(`/api/executive-workflows?runId=${encodeURIComponent(run.id)}`, { signal: controller.signal }).then(async response => {
        if (!response.ok) return;
        const data = await response.json() as { run: SavedRun };
        setRun(data.run);
        if (data.run.status !== 'running') { setState('result'); setError(undefined); savedCallback.current(); }
      }).catch(() => undefined);
    }, 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [state, run?.id]);
  const form = workflowForms[pipeline];
  const sections = resultSections(run?.outputData);
  async function submit() {
    const generation = viewGeneration.current;
    setError(undefined);
    let inputData: Record<string, string>;
    try { inputData = buildWorkflowInput(pipeline, values); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check your brief.'); return; }
    const fingerprint = JSON.stringify({ workflowId: pipeline, inputData });
    if (!requestKey.current || fingerprint !== requestFingerprint.current) { requestKey.current = crypto.randomUUID(); requestFingerprint.current = fingerprint; }
    setState('running'); setRun(undefined);
    try {
      const response = await fetch('/api/executive-workflows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId: pipeline, inputData, idempotencyKey: requestKey.current }) });
      const data = await response.json();
      // A completed request still updates history, but never another open brief.
      savedCallback.current();
      if (generation !== viewGeneration.current) return;
      if (!response.ok && !data.auditId) throw new Error(data.message ?? (response.status === 503 ? 'Saved work is temporarily unavailable. Please try again.' : 'The request could not be completed. Check your brief and try again.'));
      const unconfirmed = data.status === 'persistence-unconfirmed';
      const status = response.status === 202 || unconfirmed ? 'running' : data.success ? 'succeeded' : 'failed';
      if (unconfirmed) setError('The result could not be confirmed as saved. Checking your record; please do not start a duplicate request.');
      setRun({ id: data.auditId, workflowId: pipeline, status, inputData, outputData: data.result, errorMessage: data.message, createdAt: new Date().toISOString(), completedAt: status === 'running' ? null : new Date().toISOString(), durationMs: data.durationMs ?? null });
      setState(status === 'running' ? 'running' : 'result');
    } catch (cause) { if (generation === viewGeneration.current) { setError(cause instanceof Error ? cause.message : 'Connection interrupted. Retry this request safely.'); setState('brief'); } }
  }
  function download() {
    const text = `# ${form.title}\n\nGenerated draft for review. Execution and verification require evidence.\n\n${sections.map(section => `## ${section.label}\n\n${section.text}`).join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${pipeline}-${run?.id.slice(0, 8)}.md`; link.click(); URL.revokeObjectURL(url);
  }
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}><DialogContent className="luxury-dialog workflow-dialog sm:max-w-3xl">
    <DialogHeader className="text-left"><span className="eyebrow">{state === 'brief' ? 'DEFINE THE OUTCOME' : 'YOUR DELIVERABLE'}</span><DialogTitle className="display-title">{form.title}</DialogTitle><DialogDescription>{form.description}</DialogDescription></DialogHeader>
    {error ? <p className="workflow-error" role="alert">{error}</p> : null}
    {state === 'brief' ? <form onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label className="brief-label" htmlFor="outcome-select">Outcome</label><select id="outcome-select" className="brief-input" value={pipeline} onChange={event => { setPipeline(event.target.value as OutcomeId); setValues({}); setError(undefined); }}>{Object.entries(workflowForms).map(([id, item]) => <option key={id} value={id}>{item.title}</option>)}</select>
      <div className="deliverable-contract"><span className="eyebrow">YOU WILL RECEIVE</span><p>{form.deliverable}</p></div>
      <div className="brief-fields">{form.fields.map(item => <div className={item.multiline ? 'brief-field brief-field-wide' : 'brief-field'} key={item.key}><label className="brief-label" htmlFor={`brief-${item.key}`}>{item.label}<span>{item.required ? 'Required' : 'Optional'}</span></label>{item.options ? <select className="brief-input" id={`brief-${item.key}`} value={values[item.key] ?? ''} required={item.required} onChange={event => setValues(current => ({ ...current, [item.key]: event.target.value }))}><option value="">Choose an option</option>{item.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : item.multiline ? <textarea className="brief-input" id={`brief-${item.key}`} value={values[item.key] ?? ''} placeholder={item.placeholder} required={item.required} maxLength={24000} onChange={event => setValues(current => ({ ...current, [item.key]: event.target.value }))} /> : <input className="brief-input" id={`brief-${item.key}`} value={values[item.key] ?? ''} placeholder={item.placeholder} required={item.required} maxLength={24000} onChange={event => setValues(current => ({ ...current, [item.key]: event.target.value }))} />}</div>)}</div>
      <div className="brief-footer"><p>A generated draft for review.<br />This workflow does not apply changes to your project.</p><Button className="primary-pill" type="submit">Generate deliverable<span><ArrowRightIcon className="size-4" /></span></Button></div>
    </form> : state === 'loading' ? <div className="workflow-progress" role="status"><Loader2Icon className="size-5 animate-spin" /><p>Opening your saved work…</p></div> : state === 'running' ? <div className="workflow-progress" role="status"><Loader2Icon className="size-6 animate-spin" /><h3>Considering your brief.</h3><p>{form.stages.join(' → ')}</p><small>You can close this window. Find the result in Saved work.</small></div> : <div className="workflow-result"><div className="result-status"><span className={`run-status run-status-${run?.status ?? 'failed'}`}>{run?.status === 'succeeded' ? <><CheckIcon className="size-3" />Saved · ready to review</> : 'Needs attention'}</span>{run?.durationMs != null ? <small>{(run.durationMs / 1000).toFixed(1)}s</small> : null}{sections.length ? <Button onClick={download} size="sm" variant="outline"><DownloadIcon className="size-4" />Download</Button> : null}</div>
      {run?.errorMessage ? <p role="alert" className="workflow-error">{run.errorMessage}</p> : null}<p className="result-disclaimer">Generated recommendations. Review the proposal and run the suggested checks before applying it.</p>
      {sections.map((section, index) => <section className="result-section" key={`${section.label}-${index}`}><h3>{section.label}</h3><MessageResponse isAnimating={false}>{section.text}</MessageResponse></section>)}
      <Button variant="outline" onClick={() => { setState('brief'); setRun(undefined); requestKey.current = undefined; }}><RotateCcwIcon className="size-4" />Start another brief</Button>
    </div>}
  </DialogContent></Dialog>;
}
