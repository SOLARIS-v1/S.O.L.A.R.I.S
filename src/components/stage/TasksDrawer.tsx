import React from 'react';
import { useAstraStore } from '../../api/mockClient';
import { TaskReadinessOutput } from '../../api/types';
import { X, ListTodo, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface TasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const READINESS_CLASSES: Record<TaskReadinessOutput, { text: string; bg: string; border: string }> = {
  'No concern identified': { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Review recommended': { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Operational concern': { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  'Insufficient data': { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
};

export const TasksDrawer: React.FC<TasksDrawerProps> = ({ isOpen, onClose }) => {
  const { tasks, activeSubjectId } = useAstraStore();

  if (!isOpen) return null;

  const crewTasks = tasks.filter((t) => t.assigned_to === activeSubjectId);

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white/95 backdrop-blur-xl border-l border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-mono text-slate-800 select-none"
      aria-label="Mission Tasks Readiness Drawer"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
          <h2 className="text-xs font-mono tracking-wider uppercase font-bold text-slate-900">
            MISSION TASKS & READINESS
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {crewTasks.length === 0 ? (
          <p className="text-xs text-slate-500">No active operational tasks assigned.</p>
        ) : (
          crewTasks.map((task) => {
            const badgeCls = READINESS_CLASSES[task.readiness_output] || READINESS_CLASSES['Insufficient data'];

            return (
              <div
                key={task.id}
                className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200/80 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      {task.timeline_slot}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                      {task.title}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] border shrink-0 font-bold ${badgeCls.bg} ${badgeCls.text} ${badgeCls.border}`}
                  >
                    {task.readiness_output}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {task.readiness_reason}
                </p>

                {/* 5 Demand Gauges */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-semibold block">EXERTION</span>
                      <span className="text-[10px] text-slate-800 font-bold">
                        {task.demands.exertion}/5
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-semibold block">COGNITIVE</span>
                      <span className="text-[10px] text-slate-800 font-bold">
                        {task.demands.cognitive_load}/5
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-semibold block">DEXTERITY</span>
                      <span className="text-[10px] text-slate-800 font-bold">
                        {task.demands.dexterity}/5
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-semibold block">DURATION</span>
                      <span className="text-[10px] text-slate-800 font-bold">
                        {task.demands.duration}h
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase font-semibold block">EXPOSURE</span>
                      <span className="text-[10px] text-slate-800 font-bold">
                        {task.demands.exposure}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-slate-200/80 text-[10px] font-mono text-slate-500">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
