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
    title: "بناء ميزة كاملة",
    description: "من المتطلبات حتى التنفيذ والتحقق.",
    placeholder: "صف الميزة، المستخدم المستهدف، والسلوك المطلوب...",
    icon: SparklesIcon,
  },
  "database-engineering": {
    title: "هندسة قاعدة البيانات",
    description: "تصميم البيانات، الأداء، وسياسات الوصول.",
    placeholder: "صف الكيانات والعلاقات ونموذج الصلاحيات...",
    icon: DatabaseIcon,
  },
  "code-audit-repair": {
    title: "فحص وإصلاح الكود",
    description: "تشخيص السبب الجذري وتقديم إصلاح موثّق.",
    placeholder: "الصق الكود أو اذكر المسار والمشكلة المتوقعة...",
    icon: Code2Icon,
  },
  "release-readiness": {
    title: "تجهيز الإصدار",
    description: "فحوص الجودة وخطة النشر والتراجع.",
    placeholder: "صف نطاق الإصدار والبيئة المستهدفة...",
    icon: RocketIcon,
  },
  "architecture-evaluation": {
    title: "قرار معماري",
    description: "مقارنة البدائل وصياغة قرار قابل للمراجعة.",
    placeholder: "اذكر القرار والبدائل والقيود...",
    icon: GitBranchIcon,
  },
  "incident-response": {
    title: "معالجة حادث",
    description: "احتواء، تشخيص، إصلاح، ومراجعة ما بعد الحادث.",
    placeholder: "صف الأثر والسجلات وآخر التغييرات...",
    icon: ActivityIcon,
  },
  "continual-learning": {
    title: "استخلاص معرفة",
    description: "تحويل نتيجة سابقة إلى قاعدة محكومة بالسياق.",
    placeholder: "صف السياق والقرار والنتيجة الفعلية والدرس المستفاد...",
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
    () => `نفّذ مسار «${workflow.title}» كفريق متعدد الوكلاء.\n\n${details.trim()}`,
    [details, workflow.title],
  );

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="workflow-dialog border-white/10 bg-[#111214] p-0 text-zinc-100 sm:max-w-2xl">
        <div className="p-5 sm:p-7">
          <DialogHeader className="text-right">
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
            تفاصيل المهمة
          </label>
          <Textarea
            className="mt-2 min-h-40 resize-y border-white/10 bg-black/20 p-4 leading-7 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-500/40"
            id="workflow-details"
            onChange={(event) => setDetails(event.target.value)}
            placeholder={workflow.placeholder}
            value={details}
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-zinc-600">سيختار المنسّق الوكلاء والأدوات المناسبة تلقائياً.</p>
            <Button
              className="rounded-xl bg-zinc-100 px-5 text-zinc-950 hover:bg-white"
              disabled={!details.trim()}
              onClick={() => {
                onSendToChat(prompt);
                setDetails("");
                onClose();
              }}
            >
              ابدأ التنفيذ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
