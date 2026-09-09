import React from 'react';
import { Cloud, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { AutosaveStatus } from '../hooks/useAutosave';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSavedAt?: Date | null;
  onRetry?: () => void;
  onManualSave?: () => void;
  className?: string;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
  lastSavedAt,
  onRetry,
  onManualSave,
  className = '',
}) => {
  if (status === 'demo') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 text-[11px] font-medium ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Local Demo Mode</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-700 rounded-full border border-gray-200 text-[11px] font-medium ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin text-gray-600" />
        <span>Saving changes...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-[11px] font-medium ${className}`}>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <span>
          Auto-saved
          {lastSavedAt ? ` (${formatTime(lastSavedAt)})` : ''}
        </span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200 text-[11px] font-medium ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>Save failed</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold transition-colors ml-1 cursor-pointer"
            title="Retry cloud save"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-600 rounded-full border border-gray-200 text-[11px] font-medium ${className}`}>
      <Cloud className="w-3 h-3 text-gray-500" />
      <span>Cloud synced</span>
    </div>
  );
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
