import React, { useState, useMemo } from 'react';
import {
  FileText,
  GraduationCap,
  Award,
  Check,
  ChevronDown,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Grid,
  Layers,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Info,
  Calendar,
  User,
  Building,
  Download
} from 'lucide-react';
import {
  Project,
  ManuscriptFormattingProfile,
  FormattingProfileId,
  SupportedCitationStyle
} from '../types';
import {
  DEFAULT_FORMATTING_PROFILES,
  getFormattingProfileById,
  formatSectionHeadingTitle,
  formatFigureCaptionLabel,
  formatTableCaptionLabel
} from '../data/formattingProfiles';
import {
  renderManuscriptWithFormattedCitations,
  extractCitedReferences,
  generateReferencesList,
  formatReferenceEntry
} from '../services/citationFormatter';
import {
  exportManuscriptToDocx,
  exportManuscriptToPdf
} from '../services/manuscriptExporter';

interface ManuscriptLayoutPreviewProps {
  project: Project;
  activeProfile: ManuscriptFormattingProfile;
  onSelectProfile: (profileId: FormattingProfileId) => void;
  onClose?: () => void;
}

export const ManuscriptLayoutPreview: React.FC<ManuscriptLayoutPreviewProps> = ({
  project,
  activeProfile,
  onSelectProfile,
  onClose
}) => {
  // Preview zoom level
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [showMarginGuides, setShowMarginGuides] = useState<boolean>(false);
  const [previewProfileId, setPreviewProfileId] = useState<FormattingProfileId>(activeProfile.id);

  // Active preview profile (can be different from project's saved profile until applied)
  const currentPreviewProfile = useMemo(() => {
    return getFormattingProfileById(previewProfileId);
  }, [previewProfileId]);

  const isProfileApplied = project.formattingProfileId === previewProfileId;

  // Citation analysis
  const citationStyle: SupportedCitationStyle =
    (project.citationStyle as SupportedCitationStyle) || currentPreviewProfile.citationStyle || 'APA';

  const { citedReferences, refToOrderMap } = useMemo(() => {
    return extractCitedReferences(project);
  }, [project]);

  const formattedBibliography = useMemo(() => {
    return generateReferencesList(project, citationStyle);
  }, [project, citationStyle]);

  // Export handlers
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportManuscriptToDocx(project, currentPreviewProfile, citationStyle);
    } catch (err: any) {
      alert(`DOCX export failed: ${err.message}`);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportManuscriptToPdf(project, currentPreviewProfile, citationStyle);
    } catch (err: any) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const manuscript = project.manuscript;
  const sections = manuscript?.sections || [];

  // Parse margin values to px approximation for visual rendering
  const parseMarginToPadding = (marginStr: string) => {
    if (marginStr.includes('1.5')) return 'pl-12 sm:pl-16'; // 1.5 in binding margin
    if (marginStr.includes('1.25')) return 'pl-10 sm:pl-14';
    if (marginStr.includes('0.75')) return 'pl-6 sm:pl-8';
    return 'pl-8 sm:pl-10'; // 1.0 in standard
  };

  const getLineSpacingClass = (spacing: string) => {
    switch (spacing) {
      case '2.0':
        return 'leading-loose'; // 2.0 double space
      case '1.5':
        return 'leading-relaxed'; // 1.5 space
      case '1.15':
        return 'leading-normal';
      default:
        return 'leading-normal';
    }
  };

  return (
    <div className="bg-[#E9E8E5] border border-[#141414] min-h-[85vh] flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-[#141414] px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Editor</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#141414]" />
            <span className="font-serif-academic font-bold text-sm text-[#141414]">
              Manuscript Page Layout Preview
            </span>
          </div>
        </div>

        {/* Profile Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Profile Switcher */}
          <div className="flex items-center gap-1.5 bg-[#FAF9F7] border border-[#141414] px-2 py-1">
            <span className="text-[10px] font-mono text-[#666] uppercase font-bold">
              Template:
            </span>
            <select
              value={previewProfileId}
              onChange={(e) => setPreviewProfileId(e.target.value as FormattingProfileId)}
              className="text-xs font-mono font-bold bg-transparent text-[#141414] focus:outline-none cursor-pointer"
            >
              {DEFAULT_FORMATTING_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Apply button if previewing different */}
          {!isProfileApplied && (
            <button
              onClick={() => onSelectProfile(previewProfileId)}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to Project</span>
            </button>
          )}

          {/* Margin Guides Toggle */}
          <button
            onClick={() => setShowMarginGuides(!showMarginGuides)}
            className={`px-2.5 py-1 text-xs font-mono font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              showMarginGuides
                ? 'bg-amber-100 border-amber-800 text-amber-950'
                : 'bg-white border-[#141414] text-[#141414] hover:bg-[#E9E8E5]'
            }`}
            title="Toggle Margin Guide Lines"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Margin Guides {showMarginGuides ? 'ON' : 'OFF'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center border border-[#141414] bg-white">
            <button
              onClick={() => setZoomScale(Math.max(60, zoomScale - 10))}
              className="p-1 hover:bg-[#E9E8E5] text-[#141414] border-r border-[#141414] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] font-mono text-[#141414] font-bold">
              {zoomScale}%
            </span>
            <button
              onClick={() => setZoomScale(Math.min(140, zoomScale + 10))}
              className="p-1 hover:bg-[#E9E8E5] text-[#141414] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              id="layout-export-docx-btn"
              onClick={handleExportDocx}
              disabled={isExportingDocx || isExportingPdf}
              className="px-3 py-1 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              title={`Export formatted manuscript as DOCX using ${currentPreviewProfile.name}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? 'Generating DOCX...' : 'Export DOCX'}</span>
            </button>

            <button
              id="layout-export-pdf-btn"
              onClick={handleExportPdf}
              disabled={isExportingDocx || isExportingPdf}
              className="px-3 py-1 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              title={`Export formatted manuscript as PDF using ${currentPreviewProfile.name}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Parameters Status Bar */}
      <div className="bg-[#141414] text-white px-4 py-1.5 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold uppercase">
            &bull; {currentPreviewProfile.name}
          </span>
          <span className="text-gray-300">
            Margins: {currentPreviewProfile.pageMargins.label}
          </span>
          <span className="text-gray-300">
            Font: {currentPreviewProfile.typography.baseFontSizePt}pt Serif &bull; {currentPreviewProfile.typography.lineSpacingLabel}
          </span>
        </div>

        <div className="text-gray-400 text-[10px]">
          Citation Style: <strong className="text-white">{citationStyle}</strong> &bull; Cited Ref Count: <strong className="text-white">{citedReferences.length}</strong>
        </div>
      </div>

      {/* Simulated Document Stage */}
      <div className="flex-1 p-4 sm:p-8 flex justify-center overflow-y-auto">
        <div
          style={{
            transform: `scale(${zoomScale / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="w-full max-w-4xl space-y-8"
        >
          {/* ========================================================================= */}
          {/* PAGE 1: TITLE / COVER PAGE (Custom per profile style) */}
          {/* ========================================================================= */}
          <div
            className={`bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#141414]/30 min-h-[1050px] p-8 sm:p-14 relative flex flex-col justify-between ${
              currentPreviewProfile.pageMargins.left.includes('1.5') ? 'pl-16 sm:pl-20' : 'pl-10 sm:pl-14'
            }`}
          >
            {/* Margin Guides overlay if active */}
            {showMarginGuides && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-400/60 m-8 sm:m-12 flex flex-col justify-between p-2">
                <div className="text-[10px] font-mono text-amber-700 bg-amber-50/80 px-1 self-start border border-amber-300">
                  Left Binding Gutter: {currentPreviewProfile.pageMargins.left} | Top: {currentPreviewProfile.pageMargins.top}
                </div>
                <div className="text-[10px] font-mono text-amber-700 bg-amber-50/80 px-1 self-end border border-amber-300">
                  Right Margin: {currentPreviewProfile.pageMargins.right} | Bottom: {currentPreviewProfile.pageMargins.bottom}
                </div>
              </div>
            )}

            {/* THESIS COVER PAGE STYLE (Master's / PhD) */}
            {currentPreviewProfile.titleAuthorArea.style === 'thesis_cover_page' ? (
              <div className="h-full flex flex-col justify-between text-center font-serif-academic py-6 space-y-12">
                {/* Title & Degree Block */}
                <div className="space-y-8 pt-8">
                  <h1
                    style={{
                      fontSize: `${currentPreviewProfile.titleAuthorArea.titleFontSizePt}pt`,
                      lineHeight: '1.25'
                    }}
                    className="font-bold text-[#141414] tracking-tight uppercase px-4"
                  >
                    {project.title}
                  </h1>

                  <div className="w-16 h-0.5 bg-[#141414] mx-auto" />

                  <p className="text-sm sm:text-base italic text-[#444] max-w-xl mx-auto leading-relaxed px-4">
                    {currentPreviewProfile.titleAuthorArea.degreeStatement ||
                      'A Thesis Submitted in Partial Fulfillment of the Requirements for the Academic Degree'}
                  </p>
                </div>

                {/* Candidate & Institution Block */}
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#666] block mb-1">
                      Author / Candidate:
                    </span>
                    <span className="text-lg font-bold text-[#141414]">
                      Research Scholar
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-[#444]">
                    <p className="font-semibold text-[#141414]">
                      {currentPreviewProfile.titleAuthorArea.departmentPlaceholder || 'Department of Advanced Scientific Research'}
                    </p>
                    <p>
                      {currentPreviewProfile.titleAuthorArea.institutionPlaceholder || 'Faculty of Graduate Studies & Research'}
                    </p>
                    <p className="text-xs font-mono text-[#666] pt-1">
                      Academic Year: {new Date().getFullYear()}
                    </p>
                  </div>
                </div>

                {/* Committee Block (If enabled) */}
                {currentPreviewProfile.titleAuthorArea.showCommitteeBlock && (
                  <div className="border-t border-[#141414]/20 pt-6 max-w-lg mx-auto w-full text-left space-y-4 font-mono text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#141414] block text-center">
                      Supervisory Committee Approval
                    </span>
                    <div className="grid grid-cols-2 gap-4 text-[11px] text-[#444]">
                      <div className="border-b border-[#141414]/30 pb-1">
                        <span>Principal Advisor: _________________</span>
                      </div>
                      <div className="border-b border-[#141414]/30 pb-1">
                        <span>Co-Advisor / Reader: _________________</span>
                      </div>
                      <div className="border-b border-[#141414]/30 pb-1">
                        <span>External Examiner: _________________</span>
                      </div>
                      <div className="border-b border-[#141414]/30 pb-1">
                        <span>Department Chair: _________________</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* JOURNAL BANNER STYLE (General Research Paper) */
              <div className="space-y-6 font-serif-academic">
                {/* Journal Header Area */}
                <div className="border-b-2 border-[#141414] pb-4 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#666]">
                    <span>Original Research Manuscript</span>
                    <span>ISSN: 2456-9812 (Online)</span>
                  </div>

                  <h1
                    style={{
                      fontSize: `${currentPreviewProfile.titleAuthorArea.titleFontSizePt}pt`,
                      lineHeight: '1.25'
                    }}
                    className="font-bold text-[#141414]"
                  >
                    {project.title}
                  </h1>

                  {/* Byline */}
                  <div className="text-xs space-y-1 font-sans-ui">
                    <p className="font-bold text-[#141414]">
                      Principal Investigator<sup className="text-blue-600">1*</sup>, Research Fellow<sup className="text-blue-600">1,2</sup>, Senior Analyst<sup className="text-blue-600">3</sup>
                    </p>
                    <p className="text-[#555] text-[11px]">
                      <sup className="text-blue-600">1</sup> {currentPreviewProfile.titleAuthorArea.departmentPlaceholder || 'Department of Applied Sciences, Academic Research Institute'}
                    </p>
                    <p className="text-[#555] text-[11px]">
                      <sup className="text-blue-600">2</sup> Center for Advanced Methodological Investigation
                    </p>
                    <p className="text-[10px] text-[#777] font-mono pt-1">
                      *Correspondence: research.author@academic-institute.edu
                    </p>
                  </div>
                </div>

                {/* Abstract Box */}
                {project.summary?.conclusion || project.detailedDescription || project.briefDescription ? (
                  <div className="bg-[#FAF9F7] border border-[#141414]/20 p-5 space-y-2.5">
                    <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-[#141414]">
                      Abstract
                    </h3>
                    <p
                      style={{
                        fontSize: `${currentPreviewProfile.typography.baseFontSizePt - 1}pt`,
                        lineHeight: '1.45'
                      }}
                      className="text-[#222] text-justify"
                    >
                      {project.summary?.conclusion ||
                        project.detailedDescription ||
                        project.briefDescription ||
                        'This study investigates fundamental hypotheses within the empirical domain, providing rigorous experimental verification and evidence-based synthesis.'}
                    </p>

                    {project.keywords && project.keywords.length > 0 && (
                      <div className="pt-2 border-t border-[#141414]/10 text-xs font-mono">
                        <strong className="text-[#141414]">Keywords: </strong>
                        <span className="text-[#555] italic">
                          {project.keywords.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Page 1 Footer */}
            <div className="border-t border-[#141414]/15 pt-3 flex items-center justify-between text-[10px] font-mono text-[#777]">
              <span>RePa Academic Formatting Engine &bull; {currentPreviewProfile.name}</span>
              <span>Page 1</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAGE 2+: MANUSCRIPT BODY (Sections, Headings, Captions, Citations) */}
          {/* ========================================================================= */}
          <div
            className={`bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#141414]/30 min-h-[1050px] p-8 sm:p-14 relative space-y-8 ${
              currentPreviewProfile.pageMargins.left.includes('1.5') ? 'pl-16 sm:pl-20' : 'pl-10 sm:pl-14'
            }`}
          >
            {/* Running Header */}
            <div className="border-b border-[#141414]/15 pb-2 flex items-center justify-between text-[10px] font-mono text-[#777]">
              <span className="truncate max-w-sm font-serif-academic italic">
                {project.title}
              </span>
              <span>Page 2</span>
            </div>

            {/* Render Manuscript Sections */}
            <div className="space-y-6 font-serif-academic">
              {sections.length === 0 ? (
                <div className="text-center py-12 text-[#777] font-mono text-xs">
                  No manuscript sections generated yet. Switch to Editor to create or generate sections.
                </div>
              ) : (
                sections.map((section, idx) => {
                  const headingTitle = formatSectionHeadingTitle(
                    section.title,
                    idx,
                    currentPreviewProfile,
                    true
                  );

                  const h1Rules = currentPreviewProfile.headingHierarchy.h1;
                  const formattedContent = renderManuscriptWithFormattedCitations(
                    section.content,
                    project,
                    citationStyle
                  );

                  return (
                    <div key={section.id} className="space-y-3">
                      {/* Section Heading formatted to profile rules */}
                      <h2
                        style={{
                          fontSize: `${h1Rules.fontSizePt}pt`,
                          fontWeight: h1Rules.fontWeight,
                          textAlign: h1Rules.align,
                          marginTop: `${h1Rules.spacingBeforePt}pt`,
                          marginBottom: `${h1Rules.spacingAfterPt}pt`
                        }}
                        className={`text-[#141414] border-b border-[#141414]/10 pb-1 ${
                          h1Rules.textTransform === 'uppercase' ? 'uppercase tracking-wider' : ''
                        }`}
                      >
                        {headingTitle}
                      </h2>

                      {/* Section Paragraphs */}
                      <div
                        style={{
                          fontSize: `${currentPreviewProfile.typography.baseFontSizePt}pt`,
                          textAlign: currentPreviewProfile.typography.textAlign
                        }}
                        className={`text-[#141414] space-y-3 ${getLineSpacingClass(
                          currentPreviewProfile.typography.lineSpacing
                        )}`}
                      >
                        {formattedContent.split('\n\n').map((paragraph, pIdx) => {
                          const trimmed = paragraph.trim();
                          if (!trimmed) return null;

                          return (
                            <p
                              key={pIdx}
                              style={{
                                textIndent:
                                  currentPreviewProfile.typography.paragraphIndent !== '0.0 in'
                                    ? currentPreviewProfile.typography.paragraphIndent
                                    : undefined,
                                marginBottom: `${currentPreviewProfile.typography.paragraphSpacingPt}pt`
                              }}
                              className="leading-relaxed"
                            >
                              {trimmed}
                            </p>
                          );
                        })}
                      </div>

                      {/* Sample Figure / Table Preview in Methodology or Results */}
                      {idx === 1 && (project.figures || []).length > 0 && (
                        <div className="my-6 p-4 border border-[#141414]/20 bg-[#FAF9F7] space-y-2">
                          <div className="h-36 bg-[#EBEAE6] border border-dashed border-[#141414]/30 flex items-center justify-center text-xs font-mono text-[#666]">
                            [ Figure Canvas Representation: {project.figures[0]?.title || 'Experimental Data Plot'} ]
                          </div>
                          {/* Caption formatted according to profile */}
                          <p
                            style={{
                              fontSize: `${currentPreviewProfile.captions.fontSizePt}pt`,
                              textAlign: currentPreviewProfile.captions.align
                            }}
                            className={`text-[#333] ${
                              currentPreviewProfile.captions.italic ? 'italic' : ''
                            }`}
                          >
                            <strong className="text-[#141414] not-italic">
                              {formatFigureCaptionLabel(1, currentPreviewProfile, idx + 1)}{' '}
                            </strong>
                            {project.figures[0]?.caption ||
                              'Observed experimental data correlation and empirical measurement distribution across testing cohorts.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* ========================================================================= */}
              {/* BIBLIOGRAPHY / REFERENCES SECTION (Using existing citation system) */}
              {/* ========================================================================= */}
              <div className="pt-8 mt-8 border-t-2 border-[#141414] space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    style={{
                      fontSize: `${currentPreviewProfile.headingHierarchy.h1.fontSizePt}pt`,
                      fontWeight: currentPreviewProfile.headingHierarchy.h1.fontWeight,
                      textAlign: currentPreviewProfile.headingHierarchy.h1.align
                    }}
                    className="text-[#141414] uppercase tracking-wider"
                  >
                    {currentPreviewProfile.referenceListSettings.title}
                  </h2>
                  <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">
                    {citationStyle} Style
                  </span>
                </div>

                {citedReferences.length === 0 ? (
                  <p className="text-xs font-mono text-[#777] italic">
                    No references cited in manuscript yet. Add references in the Literature References tab to populate the bibliography.
                  </p>
                ) : (
                  <div
                    style={{
                      fontSize: `${currentPreviewProfile.typography.baseFontSizePt - 1}pt`
                    }}
                    className="space-y-3 font-serif-academic text-[#222]"
                  >
                    {formattedBibliography.map((item) => (
                      <div
                        key={item.reference.id}
                        style={{
                          paddingLeft: currentPreviewProfile.referenceListSettings.hangingIndent,
                          textIndent: `-${currentPreviewProfile.referenceListSettings.hangingIndent}`,
                          marginBottom: `${currentPreviewProfile.referenceListSettings.spacingBetweenEntriesPt}pt`
                        }}
                        className="leading-relaxed"
                      >
                        {item.formattedText}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Page Footer */}
            <div className="border-t border-[#141414]/15 pt-3 flex items-center justify-between text-[10px] font-mono text-[#777]">
              <span>Template: {currentPreviewProfile.name}</span>
              <span>RePa Academic Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
