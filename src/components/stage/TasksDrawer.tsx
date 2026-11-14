import React from 'react';
import { useAstraStore } from '../../api/mockClient';
import { TaskReadinessOutput } from '../../api/types';
import { X, ListTodo, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface TasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const READINESS_COLORS: Record<TaskReadinessOutput, string> = {
  'No concern identified': '#6FBF9B',
  'Review recommended': '#E0BE6A',
  'Operational concern': '#DE6A64',
  'Insufficient data': '#5B6573',
};

export const TasksDrawer: React.FC<TasksDrawerProps> = ({ isOpen, onClose }) => {
  const { tasks, activeSubjectId } = useAstraStore();

  if (!isOpen) return null;

  const crewTasks = tasks.filter((t) => t.assigned_to === activeSubjectId);

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0B1017]/95 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 font-mono text-[#ECE8E1] select-none"
      aria-label="Mission Tasks Readiness Drawer"
    >
      {/* Header */}
      <div className="p-4 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-[#B8CCE6]" strokeWidth={1.25} />
          <h2 className="text-xs font-mono tracking-instrument uppercase font-medium">
            MISSION TASKS & READINESS
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#8D97A6] hover:text-[#ECE8E1] hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {crewTasks.length === 0 ? (
          <p className="text-xs text-[#8D97A6]">No active operational tasks assigned.</p>
        ) : (
          crewTasks.map((task) => {
            const statusColor = READINESS_COLORS[task.readiness_output];

            return (
              <div
                key={task.id}
                className="p-3.5 rounded bg-white/[0.02] border border-white/5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-[#5B6573] uppercase block">
                      {task.timeline_slot}
                    </span>
                    <h3 className="text-xs font-medium text-[#ECE8E1] mt-0.5">
                      {task.title}
                    </h3>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] border shrink-0"
                    style={{
                      borderColor: `${statusColor}40`,
                      color: statusColor,
                      backgroundColor: `${statusColor}10`,
                    }}
                  >
                    {task.readiness_output}
                  </span>
                </div>

                <p className="text-[11px] text-[#8D97A6] leading-relaxed">
                  {task.readiness_reason}
                </p>

                {/* 5 Demand Gauges */}
                <div className="pt-2 hairline-t">
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    <div>
                      <span className="text-[8px] text-[#5B6573] uppercase block">EXERTION</span>
                      <span className="text-[10px] text-[#ECE8E1] font-light">
                        {task.demands.exertion}/5
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#5B6573] uppercase block">COGNITIVE</span>
                      <span className="text-[10px] text-[#ECE8E1] font-light">
                        {task.demands.cognitive_load}/5
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#5B6573] uppercase block">DEXTERITY</span>
                      <span className="text-[10px] text-[#ECE8E1] font-light">
                        {task.demands.dexterity}/5
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#5B6573] uppercase block">DURATION</span>
                      <span className="text-[10px] text-[#ECE8E1] font-light">
                        {task.demands.duration}h
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#5B6573] uppercase block">EXPOSURE</span>
                      <span className="text-[10px] text-[#ECE8E1] font-light">
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

      <div className="p-4 hairline-t text-[10px] text-[#5B6573]">
        Prototype decision support, not a medical device.
      </div>
    </aside>
  );
};
