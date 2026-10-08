"use client";
import { ArrowUpRightIcon, Clock3Icon, RefreshCwIcon } from 'lucide-react';
import { workflowForms, type SavedRun } from '@/lib/platform/workflow-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function RunHistory({ runs, loading, error, onSelect, onRefresh }: { readonly runs: readonly SavedRun[]; readonly loading: boolean; readonly error?: string; readonly onSelect: (run: SavedRun) => void; readonly onRefresh: () => void }) {
  return <section className="run-history" aria-label="Recent deliverables">
    <div className="section-heading"><div><span className="eyebrow">YOUR RECORD</span><h2>Recent deliverables</h2></div><Button aria-label="Refresh deliverables" variant="ghost" size="icon-sm" disabled={loading} onClick={onRefresh}><RefreshCwIcon className={loading ? 'size-4 animate-spin' : 'size-4'} /></Button></div>
    {error ? <div className="history-empty" role="alert"><p>{error}</p><button onClick={onRefresh}>Try again</button></div> : loading ? <p className="history-empty" role="status">Loading your saved work…</p> : runs.length === 0 ? <div className="history-empty"><Clock3Icon className="size-5" /><div><strong>A clean slate.</strong><p>Your generated deliverables will appear here, ready to revisit.</p></div></div> : <div className="history-list">{runs.map(run => <button className="history-row" key={run.id} onClick={() => onSelect(run)} type="button"><div><strong>{workflowForms[run.workflowId]?.title ?? run.workflowId}</strong><small>{new Date(run.createdAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div><span className={`run-status run-status-${run.status}`}>{run.status === 'succeeded' ? 'Ready to review' : run.status === 'running' ? 'Generating' : 'Needs attention'}</span><ArrowUpRightIcon className="size-4" /></button>)}</div>}
  </section>;
}

export function HistoryDialog({ open, onOpenChange, ...props }: Parameters<typeof RunHistory>[0] & { readonly open: boolean; readonly onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="luxury-dialog sm:max-w-2xl"><DialogHeader><DialogTitle>Saved work</DialogTitle><DialogDescription>Your five most recent deliverables in this browser workspace.</DialogDescription></DialogHeader><RunHistory {...props} /></DialogContent></Dialog>;
}
