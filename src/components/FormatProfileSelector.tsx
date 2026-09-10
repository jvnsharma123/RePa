import React, { useState } from 'react';
import {
  FileText,
  GraduationCap,
  Award,
  Check,
  ChevronRight,
  Settings2,
  Eye,
  Sliders,
  Sparkles,
  BookOpen,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ManuscriptFormattingProfile,
  FormattingProfileId,
  Project,
  SupportedCitationStyle
} from '../types';
import {
  DEFAULT_FORMATTING_PROFILES,
  getFormattingProfileById,
  resolveProjectFormattingProfile
} from '../data/formattingProfiles';

interface FormatProfileSelectorProps {
  project: Project;
  activeProfile: ManuscriptFormattingProfile;
  onSelectProfile: (profileId: FormattingProfileId) => void;
  onUpdateCustomProfile?: (updatedProfile: ManuscriptFormattingProfile) => void;
  onOpenPreview?: () => void;
  compact?: boolean;
}

export const FormatProfileSelector: React.FC<FormatProfileSelectorProps> = ({
  project,
  activeProfile,
  onSelectProfile,
  onUpdateCustomProfile,
  onOpenPreview,
  compact = false
}) => {
  const [selectedForInspection, setSelectedForInspection] = useState<ManuscriptFormattingProfile>(activeProfile);
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [editableProfile, setEditableProfile] = useState<ManuscriptFormattingProfile>(activeProfile);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const getProfileIcon = (id: string) => {
    switch (id) {
      case 'masters_thesis':
        return <GraduationCap className="w-5 h-5" />;
      case 'phd_thesis':
        return <Award className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleApplyProfile = (profileId: FormattingProfileId) => {
    onSelectProfile(profileId);
    const resolved = getFormattingProfileById(profileId);
    setSelectedForInspection(resolved);
    setEditableProfile(resolved);
    setIsCustomizing(false);
    setSaveFeedback(`Applied "${resolved.name}" formatting profile.`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSaveCustomProfile = () => {
    if (onUpdateCustomProfile) {
      onUpdateCustomProfile(editableProfile);
      setSelectedForInspection(editableProfile);
      setSaveFeedback(`Updated custom parameters for "${editableProfile.name}".`);
      setTimeout(() => setSaveFeedback(null), 3000);
      setIsCustomizing(false);
    }
  };

  // Compact inline dropdown / pill mode for toolbars
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-bold text-[#141414] uppercase text-[11px] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#141414]" />
            Template Profile:
          </span>
        </div>

        <div className="flex items-center gap-1">
          {DEFAULT_FORMATTING_PROFILES.map((profile) => {
            const isSelected = activeProfile.id === profile.id;
            return (
              <button
                key={profile.id}
                onClick={() => handleApplyProfile(profile.id)}
                className={`px-2.5 py-1 text-xs font-mono font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#141414] text-white border-[#141414] shadow-[1px_1px_0px_#141414]'
                    : 'bg-white hover:bg-[#E9E8E5] text-[#141414] border-[#141414]'
                }`}
                title={profile.description}
              >
                {getProfileIcon(profile.id)}
                <span>{profile.shortName}</span>
                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {onOpenPreview && (
          <button
            onClick={onOpenPreview}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-[#FAF9F7] hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open Full Page Layout Preview"
          >
            <Eye className="w-3.5 h-3.5 text-[#141414]" />
            <span>Layout Preview</span>
          </button>
        )}
      </div>
    );
  }

  // Full Rich Dashboard View for Template & Profile Management
  return (
    <div className="bg-white border border-[#141414] p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141414] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#555] uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5 text-[#141414]" />
            <span>Manuscript Presentation & Document Engine</span>
          </div>
          <h2 className="text-xl font-serif-academic font-bold text-[#141414]">
            Manuscript Formatting Profiles
          </h2>
          <p className="text-xs text-[#555] mt-0.5">
            Switch template presentation rules (margins, typography, line spacing, heading hierarchy, and cover layouts) without altering underlying research facts or citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPreview && (
            <button
              onClick={onOpenPreview}
              className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-mono font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Full Page Preview</span>
            </button>
          )}
        </div>
      </div>

      {saveFeedback && (
        <div className="bg-emerald-50 border border-emerald-400 p-3 text-xs font-mono text-emerald-900 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Profile Selection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEFAULT_FORMATTING_PROFILES.map((profile) => {
          const isActive = activeProfile.id === profile.id;
          const isInspecting = selectedForInspection.id === profile.id;

          return (
            <div
              key={profile.id}
              onClick={() => {
                setSelectedForInspection(profile);
                setEditableProfile(profile);
                setIsCustomizing(false);
              }}
              className={`border p-4 transition-all cursor-pointer flex flex-col justify-between relative ${
                isActive
                  ? 'border-[#141414] bg-[#FAF9F7] ring-2 ring-[#141414]'
                  : isInspecting
                  ? 'border-[#141414] bg-[#F7F6F3]'
                  : 'border-[#141414]/30 hover:border-[#141414] bg-white'
              }`}
            >
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#141414] text-white text-[10px] font-mono font-bold px-2 py-0.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>ACTIVE PROFILE</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 border ${
                      isActive
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-[#F0EFED] text-[#141414] border-[#141414]/40'
                    }`}
                  >
                    {getProfileIcon(profile.id)}
                  </div>
                  <div>
                    <h3 className="font-serif-academic font-bold text-base text-[#141414]">
                      {profile.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase text-[#666]">
                      {profile.badge}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#444] leading-relaxed line-clamp-3">
                  {profile.description}
                </p>

                {/* Key Specs Pills */}
                <div className="space-y-1.5 pt-2 border-t border-[#141414]/15 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-[#333]">
                    <span className="text-[#666]">Page Margins:</span>
                    <span className="font-bold">{profile.pageMargins.left} L &bull; {profile.pageMargins.top} T/B</span>
                  </div>
                  <div className="flex items-center justify-between text-[#333]">
                    <span className="text-[#666]">Typography:</span>
                    <span className="font-bold">{profile.typography.baseFontSizePt}pt Serif</span>
                  </div>
                  <div className="flex items-center justify-between text-[#333]">
                    <span className="text-[#666]">Line Spacing:</span>
                    <span className="font-bold">{profile.typography.lineSpacingLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#333]">
                    <span className="text-[#666]">Cover / Title:</span>
                    <span className="font-bold uppercase text-[10px]">{profile.titleAuthorArea.style.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-[#141414]/15 flex items-center gap-2">
                {!isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyProfile(profile.id);
                    }}
                    className="w-full py-1.5 text-xs font-mono font-bold bg-[#141414] hover:bg-[#2A2A2A] text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Apply Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-full text-center py-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 font-bold flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied to Manuscript</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Profile Inspector & Customizer Section */}
      <div className="border border-[#141414] bg-[#FAF9F7] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141414]/20 pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#141414]" />
            <h3 className="font-serif-academic font-bold text-base text-[#141414]">
              Profile Specifications: {selectedForInspection.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {activeProfile.id !== selectedForInspection.id && (
              <button
                onClick={() => handleApplyProfile(selectedForInspection.id)}
                className="px-3 py-1 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Apply This Profile
              </button>
            )}

            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className="px-3 py-1 bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isCustomizing ? 'Hide Customizer' : 'Edit Parameters'}</span>
            </button>
          </div>
        </div>

        {/* Live Parameter Matrix */}
        {!isCustomizing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* 1. Page Margins */}
            <div className="bg-white border border-[#141414] p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-[#141414]/15 pb-1.5">
                <span className="font-bold uppercase text-[#141414] text-[11px]">1. Page Margins</span>
              </div>
              <ul className="space-y-1 text-[#444] text-[11px]">
                <li className="flex justify-between">
                  <span className="text-[#666]">Left Margin:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.pageMargins.left}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Right Margin:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.pageMargins.right}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Top Margin:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.pageMargins.top}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Bottom Margin:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.pageMargins.bottom}</span>
                </li>
                {selectedForInspection.pageMargins.gutter && (
                  <li className="flex justify-between text-emerald-800">
                    <span>Binding Gutter:</span>
                    <span className="font-bold">{selectedForInspection.pageMargins.gutter}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* 2. Typography & Spacing */}
            <div className="bg-white border border-[#141414] p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-[#141414]/15 pb-1.5">
                <span className="font-bold uppercase text-[#141414] text-[11px]">2. Typography</span>
              </div>
              <ul className="space-y-1 text-[#444] text-[11px]">
                <li className="flex justify-between">
                  <span className="text-[#666]">Font Family:</span>
                  <span className="font-bold text-[#141414]">Times New Roman</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Body Size:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.typography.baseFontSizePt} pt</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Line Spacing:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.typography.lineSpacingLabel}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Paragraph Indent:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.typography.paragraphIndent}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Alignment:</span>
                  <span className="font-bold text-[#141414] uppercase">{selectedForInspection.typography.textAlign}</span>
                </li>
              </ul>
            </div>

            {/* 3. Heading Hierarchy */}
            <div className="bg-white border border-[#141414] p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-[#141414]/15 pb-1.5">
                <span className="font-bold uppercase text-[#141414] text-[11px]">3. Headings</span>
              </div>
              <ul className="space-y-1 text-[#444] text-[11px]">
                <li className="flex justify-between">
                  <span className="text-[#666]">Primary (H1):</span>
                  <span className="font-bold text-[#141414]">
                    {selectedForInspection.headingHierarchy.h1.fontSizePt}pt ({selectedForInspection.headingHierarchy.h1.numberingStyle})
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Sub-heading (H2):</span>
                  <span className="font-bold text-[#141414]">
                    {selectedForInspection.headingHierarchy.h2.fontSizePt}pt ({selectedForInspection.headingHierarchy.h2.numberingStyle})
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Sub-sub (H3):</span>
                  <span className="font-bold text-[#141414]">
                    {selectedForInspection.headingHierarchy.h3.fontSizePt}pt Italic
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">H1 Alignment:</span>
                  <span className="font-bold text-[#141414] uppercase">{selectedForInspection.headingHierarchy.h1.align}</span>
                </li>
              </ul>
            </div>

            {/* 4. Title Area, Captions & Citations */}
            <div className="bg-white border border-[#141414] p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-[#141414]/15 pb-1.5">
                <span className="font-bold uppercase text-[#141414] text-[11px]">4. Layout & Citations</span>
              </div>
              <ul className="space-y-1 text-[#444] text-[11px]">
                <li className="flex justify-between">
                  <span className="text-[#666]">Cover Style:</span>
                  <span className="font-bold text-[#141414] uppercase text-[10px]">
                    {selectedForInspection.titleAuthorArea.style.replace(/_/g, ' ')}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Figure Caption:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.captions.figureLabelPrefix} ({selectedForInspection.captions.figureNumbering})</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Table Caption:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.captions.tableLabelPrefix} ({selectedForInspection.captions.tableNumbering})</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Citation Default:</span>
                  <span className="font-bold text-[#141414]">{selectedForInspection.citationStyle}</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Editable Parameters Form */
          <div className="bg-white border border-[#141414] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2 font-mono text-xs">
              <span className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Customize Template Parameters ({editableProfile.name})
              </span>
              <span className="text-[#666] text-[10px]">Changes are saved for this project</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
              {/* Left Margin */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#141414]">
                  Left Margin (Binding Gutter)
                </label>
                <select
                  value={editableProfile.pageMargins.left}
                  onChange={(e) =>
                    setEditableProfile({
                      ...editableProfile,
                      pageMargins: {
                        ...editableProfile.pageMargins,
                        left: e.target.value,
                        label: `${e.target.value} Left, ${editableProfile.pageMargins.top} Top/Bottom`
                      }
                    })
                  }
                  className="w-full bg-[#FAF9F7] border border-[#141414] p-1.5 text-xs text-[#141414] focus:outline-none"
                >
                  <option value="1.0 in">1.0 in (Standard 2.54 cm)</option>
                  <option value="1.25 in">1.25 in (Light Binding)</option>
                  <option value="1.5 in">1.5 in (Standard Thesis Binding)</option>
                  <option value="1.75 in">1.75 in (Wide Binding)</option>
                </select>
              </div>

              {/* Line Spacing */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#141414]">
                  Line Spacing
                </label>
                <select
                  value={editableProfile.typography.lineSpacing}
                  onChange={(e) => {
                    const val = e.target.value as '1.0' | '1.15' | '1.5' | '2.0';
                    const labels = {
                      '1.0': 'Single Spaced (1.0)',
                      '1.15': '1.15x Line Spacing',
                      '1.5': '1.5x Line Spacing',
                      '2.0': 'Double Spaced (2.0)'
                    };
                    setEditableProfile({
                      ...editableProfile,
                      typography: {
                        ...editableProfile.typography,
                        lineSpacing: val,
                        lineSpacingLabel: labels[val]
                      }
                    })
                  }}
                  className="w-full bg-[#FAF9F7] border border-[#141414] p-1.5 text-xs text-[#141414] focus:outline-none"
                >
                  <option value="1.0">1.0 (Single Spaced)</option>
                  <option value="1.15">1.15 (Compact Journal)</option>
                  <option value="1.5">1.5 (Standard Academic)</option>
                  <option value="2.0">2.0 (Double Spaced / Dissertation)</option>
                </select>
              </div>

              {/* Body Font Size */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#141414]">
                  Body Font Size (pt)
                </label>
                <select
                  value={editableProfile.typography.baseFontSizePt}
                  onChange={(e) =>
                    setEditableProfile({
                      ...editableProfile,
                      typography: {
                        ...editableProfile.typography,
                        baseFontSizePt: parseInt(e.target.value, 10)
                      }
                    })
                  }
                  className="w-full bg-[#FAF9F7] border border-[#141414] p-1.5 text-xs text-[#141414] focus:outline-none"
                >
                  <option value={10}>10 pt (Dense)</option>
                  <option value={11}>11 pt (Journal standard)</option>
                  <option value={12}>12 pt (Thesis standard)</option>
                </select>
              </div>

              {/* Paragraph Indent */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#141414]">
                  Paragraph Indentation
                </label>
                <select
                  value={editableProfile.typography.paragraphIndent}
                  onChange={(e) =>
                    setEditableProfile({
                      ...editableProfile,
                      typography: {
                        ...editableProfile.typography,
                        paragraphIndent: e.target.value
                      }
                    })
                  }
                  className="w-full bg-[#FAF9F7] border border-[#141414] p-1.5 text-xs text-[#141414] focus:outline-none"
                >
                  <option value="0.0 in">0.0 in (Block Paragraphs)</option>
                  <option value="0.5 in">0.5 in (First Line Indented)</option>
                </select>
              </div>

              {/* Text Alignment */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#141414]">
                  Text Alignment
                </label>
                <select
                  value={editableProfile.typography.textAlign}
                  onChange={(e) =>
                    setEditableProfile({
                      ...editableProfile,
                      typography: {
                        ...editableProfile.typography,
                        textAlign: e.target.value as 'left' | 'justify'
                      }
                    })
                  }
                  className="w-full bg-[#FAF9F7] border border-[#141414] p-1.5 text-xs text-[#141414] focus:outline-none"
                >
                  <option value="left">Left Aligned</option>
                  <option value="justify">Justified</option>
                </select>
              </div>

              {/* Title / Cover Layout */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#141414]">
                  Title / Cover Style
                </label>
                <select
                  value={editableProfile.titleAuthorArea.style}
                  onChange={(e) =>
                    setEditableProfile({
                      ...editableProfile,
                      titleAuthorArea: {
                        ...editableProfile.titleAuthorArea,
                        style: e.target.value as 'journal_banner' | 'thesis_cover_page' | 'compact_academic'
                      }
                    })
                  }
                  className="w-full bg-[#FAF9F7] border border-[#141414] p-1.5 text-xs text-[#141414] focus:outline-none"
                >
                  <option value="journal_banner">Journal Header Banner</option>
                  <option value="thesis_cover_page">Formal Thesis / Dissertation Cover</option>
                  <option value="compact_academic">Compact Heading Block</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#141414]/20">
              <button
                onClick={() => setIsCustomizing(false)}
                className="px-3 py-1.5 bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomProfile}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Profile Tweaks</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
