import React from 'react';
import { WorkflowStep, WorkflowStatus } from '../../types';
import { Check, Clock, XCircle, AlertCircle } from 'lucide-react';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStepOrder?: number;
  status: WorkflowStatus;
  className?: string;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  steps = [],
  currentStepOrder = 1,
  status,
  className = '',
}) => {
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className={`w-full py-2 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting Background Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-black/10 dark:bg-white/10 -z-0" />

        {sortedSteps.map((step) => {
          let stepState: 'completed' | 'current' | 'pending' | 'rejected' = 'pending';

          if (status === 'approved') {
            stepState = 'completed';
          } else if (status === 'rejected') {
            if (step.step_order < currentStepOrder) stepState = 'completed';
            else if (step.step_order === currentStepOrder) stepState = 'rejected';
            else stepState = 'pending';
          } else {
            if (step.step_order < currentStepOrder) stepState = 'completed';
            else if (step.step_order === currentStepOrder) stepState = 'current';
            else stepState = 'pending';
          }

          const stateStyles = {
            completed: 'bg-apple-green text-white border-apple-green shadow-sm',
            current: 'bg-apple-blue text-white border-apple-blue shadow-md ring-4 ring-apple-blue/20 animate-pulse',
            rejected: 'bg-apple-red text-white border-apple-red shadow-sm',
            pending: 'bg-white dark:bg-neutral-800 text-neutral-400 border-black/20 dark:border-white/20',
          }[stepState];

          const icons = {
            completed: <Check className="w-3.5 h-3.5" />,
            current: <Clock className="w-3.5 h-3.5" />,
            rejected: <XCircle className="w-3.5 h-3.5" />,
            pending: <span className="text-xs font-semibold">{step.step_order}</span>,
          }[stepState];

          return (
            <div key={step.step_id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${stateStyles}`}
              >
                {icons}
              </div>
              <div className="mt-2 text-center max-w-[110px]">
                <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {step.step_name}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {step.approver_role.replace('_', ' ')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
