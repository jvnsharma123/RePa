import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Project, ManuscriptSection } from '../types';

interface ConflictWarningBannerProps {
  project: Project;
  activeSection: ManuscriptSection;
  onNavigateToAnalysis: () => void;
}

export const ConflictWarningBanner: React.FC<ConflictWarningBannerProps> = ({
  project,
  activeSection,
  onNavigateToAnalysis,
}) => {
  // Check if any files have unresolved conflicts
  const filesWithConflicts = (project.files || []).filter((f) =>
    (f.aiAnalysis?.conflictsDetected || []).some((c) => !c.resolved)
  );

  const factsWithConflicts = (project.facts || []).filter(
    (f) => f.conflictDetails && !f.userVerified
  );

  const hasConflicts = filesWithConflicts.length > 0 || factsWithConflicts.length > 0;

  if (!hasConflicts) return null;

  return (
    <div className="bg-amber-950/60 border border-amber-800/90 rounded-lg p-3 flex items-center justify-between gap-3 text-xs mb-3 animate-in fade-in duration-150">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-amber-900 flex items-center justify-center text-amber-300 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-amber-200">Unresolved Empirical Discrepancy Detected: </span>
          <span className="text-amber-300/90">
            {filesWithConflicts.length + factsWithConflicts.length} data point(s) contain conflicting values between uploaded research materials. Section generation may produce divergent claims until resolved.
          </span>
        </div>
      </div>
      <button
        onClick={onNavigateToAnalysis}
        className="bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-medium px-3 py-1 rounded text-xs shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
      >
        <span>Resolve in Analysis</span>
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};
