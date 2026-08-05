'use client';

import { Upload, Settings, Download } from 'lucide-react';
import { ToolStep } from '@/hooks/useToolState';

interface StepIndicatorProps {
  currentStep: ToolStep;
  labels?: {
    upload?: string;
    options?: string;
    download?: string;
  };
}

export function StepIndicator({
  currentStep,
  labels = {
    upload: 'Upload',
    options: 'Options',
    download: 'Download',
  },
}: StepIndicatorProps) {
  const steps: { key: ToolStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'upload', label: labels.upload || 'Upload', icon: Upload },
    { key: 'options', label: labels.options || 'Options', icon: Settings },
    { key: 'download', label: labels.download || 'Download', icon: Download },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-center max-w-md mx-auto">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = index < currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex w-20 flex-col items-center gap-2">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-brand-red text-white shadow-lg shadow-red-500/20 scale-110' : ''}
                    ${isCompleted ? 'bg-green-50 text-green-600' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-100 text-gray-400' : ''}
                  `}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`
                    text-xs font-semibold transition-colors
                    ${isActive ? 'text-brand-dark' : ''}
                    ${isCompleted ? 'text-green-600' : ''}
                    ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="mx-1 h-0.5 w-10 bg-gray-200 relative sm:mx-2 sm:w-16">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-red transition-all duration-300"
                    style={{ width: isCompleted || isActive ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
