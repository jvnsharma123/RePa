import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Search,
  BookOpen,
  Info,
  Sliders,
  Maximize2,
  RefreshCw,
  FileCheck,
  Cpu,
  History,
  Tag,
  Database,
  Calendar,
  Save,
  Check,
  BarChart2,
  Upload,
  ArrowRight,
  ExternalLink,
  Table as TableIcon,
  Image as ImageIcon,
  Bookmark
} from 'lucide-react';
import {
  Project,
  ManuscriptSection,
  ProvenanceType,
  ResearchFact,
  ResearchFile,
  FactCategory,
  ManuscriptVersion,
  ManuscriptPlan,
  PlanSectionItem,
  ParagraphProvenance,
  MissingInfoItem,
  ProjectReference,
  ManuscriptCitation,
  SupportedCitationStyle,
  FormattingProfileId,
  ManuscriptFormattingProfile
} from '../types';
import { FORMAT_SPECIFICATIONS, DOCUMENT_TYPE_OPTIONS } from '../data/catalog';
import {
  DEFAULT_FORMATTING_PROFILES,
  getFormattingProfileById,
  resolveProjectFormattingProfile
} from '../data/formattingProfiles';
import {
  runAssistantAction,
  exportManuscript,
  exportManuscriptToDocx,
  exportManuscriptToPdf,
  analyzeResearchFile,
  createManuscriptVersion,
  generateAcademicSection,
  extractProjectFacts,
  runQualityChecks
} from '../services/api';
import { AutosaveIndicator } from './AutosaveIndicator';
import { AutosaveStatus } from '../hooks/useAutosave';
import { uploadResearchFileToSupabase } from '../services/supabase';
import { saveManuscriptCitation } from '../services/supabaseData';
import { ResearchAnalysisWorkspace } from './ResearchAnalysisWorkspace';
import { FactVerificationView } from './FactVerificationView';
import { TitleGeneratorModal } from './TitleGeneratorModal';
import { SectionRegenerationModal } from './SectionRegenerationModal';
import { ClaimInspectorDrawer } from './ClaimInspectorDrawer';
import { MissingInformationScanner } from './MissingInformationScanner';
import { FiguresAndTablesWorkspace } from './FiguresAndTablesWorkspace';
import { ReferenceLibraryWorkspace } from './ReferenceLibraryWorkspace';
import { ConflictWarningBanner } from './ConflictWarningBanner';
import { CitationStyleSelector } from './CitationStyleSelector';
import { ManuscriptReferencesSection } from './ManuscriptReferencesSection';
import { FormatProfileSelector } from './FormatProfileSelector';
import { ManuscriptLayoutPreview } from './ManuscriptLayoutPreview';
import {
  formatInTextCitation,
  extractCitedReferences,
  renderManuscriptWithFormattedCitations,
  generateFormattedBibliographyText
} from '../services/citationFormatter';
import { PlanTier, PLAN_CONFIGS, SubscriptionState } from '../types/subscription';
import { checkPlanLimits } from '../services/subscriptionService';
import { UpgradeModal } from './UpgradeModal';
import { UserProfile } from '../types';

interface ManuscriptWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToQualityChecks: () => void;
  onNavigateToSimilarity: () => void;
  onNavigateToAIAnalysis: () => void;
  onOpenFactProtectionModal: () => void;
  autosaveStatus?: AutosaveStatus;
  lastSavedAt?: Date | null;
  onRetrySave?: () => void;
  onManualSave?: () => void;
  userId?: string;
  currentPlan?: PlanTier;
  subscriptionState?: SubscriptionState;
  onRecordUsage?: (action: 'ai_analysis' | 'export') => void;
  onPlanUpgraded?: (plan: PlanTier) => void;
  userProfile?: UserProfile | null;
  onNavigateToPricing?: () => void;
}

type WorkspaceTab =
  | 'editor'
  | 'layout_preview'
  | 'formatting_profile'
  | 'analysis'
  | 'facts'
  | 'references'
  | 'summary'
  | 'plan'
  | 'files'
  | 'figures'
  | 'info'
  | 'versions';

export const ManuscriptWorkspace: React.FC<ManuscriptWorkspaceProps> = ({
  project,
  onUpdateProject,
  onNavigateToQualityChecks,
  onNavigateToSimilarity,
  onNavigateToAIAnalysis,
  onOpenFactProtectionModal,
  autosaveStatus = 'idle',
  lastSavedAt,
  onRetrySave,
  onManualSave,
  userId = 'default_user',
  currentPlan = 'FREE',
  subscriptionState,
  onRecordUsage,
  onPlanUpgraded,
  userProfile,
  onNavigateToPricing,
}) => {
  const manuscript = project.manuscript;
  const sections = manuscript?.sections || [];

  const activePlan: PlanTier = (currentPlan as PlanTier) || 'FREE';

  // Subscription Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<{
    title: string;
    description: string;
    targetPlan: 'RESEARCHER' | 'PRO_RESEARCHER';
  }>({
    title: 'Plan Upgrade Required',
    description: 'Upgrade your subscription to unlock this feature.',
    targetPlan: 'RESEARCHER',
  });

  // Active top-level workspace tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');

  // Editor states & Cursor Position Tracking
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [editorCursorPosition, setEditorCursorPosition] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || 'sec-title');
  const [showProvenanceTags, setShowProvenanceTags] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'assistant' | 'facts' | 'plan' | 'missing_info'>('assistant');
  const [selectedText, setSelectedText] = useState<string>('');
  const [assistantLoading, setAssistantLoading] = useState<boolean>(false);
  const [assistantResult, setAssistantResult] = useState<string | null>(null);
  const [assistantExplanation, setAssistantExplanation] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  // Phase 3 Modal and Drawer states
  const [isTitleModalOpen, setIsTitleModalOpen] = useState<boolean>(false);
  const [isSectionRegenModalOpen, setIsSectionRegenModalOpen] = useState<boolean>(false);
  const [sectionForRegen, setSectionForRegen] = useState<ManuscriptSection | null>(null);
  const [isClaimInspectorOpen, setIsClaimInspectorOpen] = useState<boolean>(false);
  const [claimToInspect, setClaimToInspect] = useState<string>('');

  // File analysis state
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [selectedFileForModal, setSelectedFileForModal] = useState<ResearchFile | null>(null);

  // File upload state
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [uploadCategory, setUploadCategory] = useState<string>('Figure');

  // Add Fact modal state
  const [isAddFactOpen, setIsAddFactOpen] = useState<boolean>(false);
  const [newFactStatement, setNewFactStatement] = useState<string>('');
  const [newFactCategory, setNewFactCategory] = useState<FactCategory>('Findings/Data');
  const [newFactValue, setNewFactValue] = useState<string>('');
  const [newFactUnit, setNewFactUnit] = useState<string>('');

  // Snapshot modal state
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);
  const [snapshotTitle, setSnapshotTitle] = useState<string>('');
  const [snapshotSummary, setSnapshotSummary] = useState<string>('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);

  // Fact filter
  const [factCategoryFilter, setFactCategoryFilter] = useState<string>('All');
  const [factSearchQuery, setFactSearchQuery] = useState<string>('');

  // Editable Project Info state (for tab 'info')
  const [editTitle, setEditTitle] = useState<string>(project.title);
  const [editHypothesis, setEditHypothesis] = useState<string>(project.hypothesis || '');
  const [editMethodology, setEditMethodology] = useState<string>(project.methodology || '');
  const [editPopulation, setEditPopulation] = useState<string>(project.studyPopulationSample || '');
  const [editVariables, setEditVariables] = useState<string>(project.variables || '');
  const [editFindings, setEditFindings] = useState<string>(project.majorFindings || '');
  const [editConclusion, setEditConclusion] = useState<string>(project.conclusion || '');
  const [editLimitations, setEditLimitations] = useState<string>(project.limitations || '');
  const [infoSavedSuccess, setInfoSavedSuccess] = useState<boolean>(false);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];
  const formatSpec = FORMAT_SPECIFICATIONS.find((f) => f.id === project.formatId) || FORMAT_SPECIFICATIONS[0];
  const docTypeSpec = DOCUMENT_TYPE_OPTIONS.find((d) => d.key === project.documentTypeId) || DOCUMENT_TYPE_OPTIONS[0];

  // Active Formatting Profile (General Research Paper, Master's Thesis, PhD Thesis)
  const activeFormattingProfile: ManuscriptFormattingProfile = useMemo(() => {
    return resolveProjectFormattingProfile(project);
  }, [project]);

  const handleSelectFormattingProfile = (profileId: FormattingProfileId) => {
    const profile = getFormattingProfileById(profileId);
    onUpdateProject({
      ...project,
      formattingProfileId: profileId,
      citationStyle: profile.citationStyle || project.citationStyle || 'APA',
      manuscript: manuscript
        ? {
            ...manuscript,
            formattingProfileId: profileId,
            citationStyle: profile.citationStyle || manuscript.citationStyle || 'APA',
            lastSaved: new Date().toISOString()
          }
        : undefined,
      updatedAt: new Date().toISOString()
    });
    setCitationFormatNotice(`Applied "${profile.name}" formatting profile.`);
    setTimeout(() => setCitationFormatNotice(null), 3000);
  };

  const handleUpdateCustomProfile = (customProfile: ManuscriptFormattingProfile) => {
    onUpdateProject({
      ...project,
      formattingProfileId: customProfile.id,
      customFormattingProfile: customProfile,
      updatedAt: new Date().toISOString()
    });
    setCitationFormatNotice(`Updated profile parameters for "${customProfile.name}".`);
    setTimeout(() => setCitationFormatNotice(null), 3000);
  };

  // Citation Style State (Vancouver, APA, IEEE)
  const activeCitationStyle: SupportedCitationStyle =
    (project.citationStyle as SupportedCitationStyle) ||
    (project.manuscript?.citationStyle as SupportedCitationStyle) ||
    activeFormattingProfile.citationStyle ||
    (formatSpec.citationStyle === 'Vancouver' || formatSpec.citationStyle === 'IEEE' || formatSpec.citationStyle === 'APA'
      ? (formatSpec.citationStyle as SupportedCitationStyle)
      : 'APA');

  const [isFormattedCitationPreview, setIsFormattedCitationPreview] = useState<boolean>(false);
  const [citationFormatNotice, setCitationFormatNotice] = useState<string | null>(null);

  const handleCitationStyleChange = (newStyle: SupportedCitationStyle) => {
    onUpdateProject({
      ...project,
      citationStyle: newStyle,
      manuscript: manuscript
        ? {
            ...manuscript,
            citationStyle: newStyle,
            lastSaved: new Date().toISOString()
          }
        : undefined,
      updatedAt: new Date().toISOString()
    });
    setCitationFormatNotice(`Switched citation style to ${newStyle}.`);
    setTimeout(() => setCitationFormatNotice(null), 2500);
  };

  const handleFormatAllInTextTags = () => {
    if (!manuscript) return;
    const updatedSections = manuscript.sections.map((sec) => {
      const formattedContent = renderManuscriptWithFormattedCitations(sec.content || '', project, activeCitationStyle);
      const words = formattedContent.trim() ? formattedContent.trim().split(/\s+/).length : 0;
      return {
        ...sec,
        content: formattedContent,
        wordCount: words,
        lastModified: new Date().toISOString()
      };
    });

    onUpdateProject({
      ...project,
      citationStyle: activeCitationStyle,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
        totalWordCount: updatedSections.reduce((acc, s) => acc + s.wordCount, 0),
        lastSaved: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    setCitationFormatNotice(`Applied ${activeCitationStyle} format across in-text citation tags.`);
    setTimeout(() => setCitationFormatNotice(null), 3000);
  };

  const handleAppendReferencesToManuscript = (formattedText: string) => {
    if (!manuscript) return;
    const existingRefSec = manuscript.sections.find(
      (s) => s.title.toLowerCase().includes('reference') || s.title.toLowerCase().includes('bibliography')
    );

    let updatedSections: ManuscriptSection[];
    if (existingRefSec) {
      updatedSections = manuscript.sections.map((s) =>
        s.id === existingRefSec.id
          ? {
              ...s,
              content: formattedText,
              wordCount: formattedText.trim().split(/\s+/).length,
              lastModified: new Date().toISOString()
            }
          : s
      );
      setActiveSectionId(existingRefSec.id);
    } else {
      const newSec: ManuscriptSection = {
        id: `sec-references-${Date.now()}`,
        sectionKey: 'references',
        title: 'References',
        content: formattedText,
        wordCount: formattedText.trim().split(/\s+/).length,
        status: 'draft',
        isRequired: false,
        provenanceList: [],
        lastModified: new Date().toISOString(),
        order: manuscript.sections.length + 1
      };
      updatedSections = [...manuscript.sections, newSec];
      setActiveSectionId(newSec.id);
    }

    onUpdateProject({
      ...project,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
        totalWordCount: updatedSections.reduce((acc, s) => acc + s.wordCount, 0),
        lastSaved: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    setCitationFormatNotice(`References section updated in manuscript with ${activeCitationStyle} bibliography.`);
    setTimeout(() => setCitationFormatNotice(null), 3000);
  };

  // Helper for updating section content
  const handleSectionContentChange = (newContent: string) => {
    if (!manuscript) return;
    const updatedSections = manuscript.sections.map((s) => {
      if (s.id === activeSectionId) {
        const words = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;
        return { ...s, content: newContent, wordCount: words, lastModified: new Date().toISOString() };
      }
      return s;
    });

    const totalWords = updatedSections.reduce((acc, s) => acc + s.wordCount, 0);

    const updatedProject: Project = {
      ...project,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
        totalWordCount: totalWords
      },
      updatedAt: new Date().toISOString()
    };

    onUpdateProject(updatedProject);
  };

  // Helper for adding a new section
  const handleAddSection = () => {
    const title = prompt('Enter new section title (e.g., Supplementary Discussion, Ethical Considerations):');
    if (!title?.trim() || !manuscript) return;

    const newSec: ManuscriptSection = {
      id: `sec-${Date.now()}`,
      sectionKey: title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      title: title.trim(),
      content: 'Draft content for this section...',
      wordCount: 5,
      order: manuscript.sections.length + 1,
      lastModified: new Date().toISOString(),
      provenanceList: [
        {
          paragraphId: `p-${Date.now()}-1`,
          paragraphIndex: 0,
          textSnippet: 'Draft content for this section...',
          provenanceType: 'user_fact',
          factIds: [],
          sourceLabels: ['User Added Section'],
          userVerified: true
        }
      ],
      isRequired: false
    };

    const updatedProject: Project = {
      ...project,
      manuscript: {
        ...manuscript,
        sections: [...manuscript.sections, newSec],
        totalWordCount: manuscript.totalWordCount + 5
      }
    };

    onUpdateProject(updatedProject);
    setActiveSectionId(newSec.id);
  };

  // Regenerate an individual section with AI (Opens Safe Preview Modal)
  const handleOpenSectionRegenModal = (section: ManuscriptSection) => {
    setSectionForRegen(section);
    setIsSectionRegenModalOpen(true);
  };

  const handleAcceptSectionDraft = (
    newContent: string,
    provenance: ParagraphProvenance[],
    missingInfo?: MissingInfoItem[],
    mode: 'replace' | 'append' = 'replace'
  ) => {
    if (!manuscript || !sectionForRegen) return;
    const finalContent =
      mode === 'append' && sectionForRegen.content.trim()
        ? `${sectionForRegen.content.trim()}\n\n${newContent.trim()}`
        : newContent;

    const words = finalContent.trim().split(/\s+/).filter(Boolean).length;
    const updatedSections = manuscript.sections.map((s) => {
      if (s.id === sectionForRegen.id) {
        return {
          ...s,
          content: finalContent,
          wordCount: words,
          provenanceList: provenance.length > 0 ? provenance : s.provenanceList,
          missingInfo: missingInfo || s.missingInfo,
          status: 'Drafted' as const,
          lastRegeneratedAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };
      }
      return s;
    });

    const totalWords = updatedSections.reduce((acc, s) => acc + s.wordCount, 0);
    onUpdateProject({
      ...project,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
        totalWordCount: totalWords,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleApplyTitle = (newTitle: string) => {
    if (!manuscript) return;
    const updatedSections = manuscript.sections.map((s) => {
      if (s.sectionKey === 'title' || s.title.toLowerCase().includes('title')) {
        return {
          ...s,
          content: newTitle,
          wordCount: newTitle.split(/\s+/).filter(Boolean).length,
          lastModified: new Date().toISOString(),
        };
      }
      return s;
    });

    onUpdateProject({
      ...project,
      title: newTitle,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
        totalWordCount: updatedSections.reduce((acc, s) => acc + s.wordCount, 0),
      },
      updatedAt: new Date().toISOString(),
    });
    setEditTitle(newTitle);
  };

  const handleOpenClaimInspector = (textSnippet?: string) => {
    const text = textSnippet || selectedText.trim() || activeSection?.content || '';
    setClaimToInspect(text);
    setIsClaimInspectorOpen(true);
  };

  const handleLinkFactToSection = (factId: string) => {
    if (!manuscript || !activeSection) return;
    const currentLinked = activeSection.linkedFactIds || [];
    if (currentLinked.includes(factId)) return;
    const updatedSections = manuscript.sections.map((s) => {
      if (s.id === activeSection.id) {
        return {
          ...s,
          linkedFactIds: [...currentLinked, factId],
          lastModified: new Date().toISOString(),
        };
      }
      return s;
    });
    onUpdateProject({
      ...project,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUnlinkFactFromSection = (factId: string) => {
    if (!manuscript || !activeSection) return;
    const currentLinked = activeSection.linkedFactIds || [];
    const updatedSections = manuscript.sections.map((s) => {
      if (s.id === activeSection.id) {
        return {
          ...s,
          linkedFactIds: currentLinked.filter((id) => id !== factId),
          lastModified: new Date().toISOString(),
        };
      }
      return s;
    });
    onUpdateProject({
      ...project,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // --------------------------------------------------------------------------
  // Phase 4.1: Basic Citation Insertion Handler
  // --------------------------------------------------------------------------
  const handleInsertCitation = (selectedReferences: ProjectReference[]) => {
    if (!selectedReferences || selectedReferences.length === 0) return;

    // Target active section (or first available section)
    const targetSection =
      activeSection ||
      (manuscript?.sections && manuscript.sections.length > 0 ? manuscript.sections[0] : null);
    if (!targetSection) return;

    // 1. Build citation keys/tags using the active citation style (Vancouver: (1), APA: (Smith, 2023), IEEE: [1]):
    const { refToOrderMap } = extractCitedReferences(project);
    const styleFormattedTag = formatInTextCitation(selectedReferences, activeCitationStyle, refToOrderMap);
    
    // Fallback tag if formatter returns empty
    const citationTags = selectedReferences.map((ref) => {
      if (ref.citationKey && ref.citationKey.trim()) {
        return ref.citationKey.trim();
      }
      const firstAuthor =
        ref.authors?.[0]?.lastName || ref.authors?.[0]?.fullName?.split(' ')[0] || 'Ref';
      const year = ref.publicationYear ? `${ref.publicationYear}` : '';
      const cleanAuthor = firstAuthor.replace(/[^a-zA-Z0-9]/g, '');
      return `${cleanAuthor}${year}`;
    });
    const formattedTag = styleFormattedTag || `[${citationTags.join('; ')}]`;

    // 2. Insert at current cursor position or append to content
    const currentContent = targetSection.content || '';
    const insertPos =
      editorCursorPosition !== null &&
      editorCursorPosition >= 0 &&
      editorCursorPosition <= currentContent.length
        ? editorCursorPosition
        : currentContent.length;

    const leadingSpace =
      insertPos > 0 && currentContent[insertPos - 1] !== ' ' && currentContent[insertPos - 1] !== '\n'
        ? ' '
        : '';
    const trailingSpace =
      insertPos < currentContent.length && currentContent[insertPos] !== ' ' && currentContent[insertPos] !== '\n'
        ? ' '
        : ' ';

    const insertionText = `${leadingSpace}${formattedTag}${trailingSpace}`;
    const updatedContent =
      currentContent.slice(0, insertPos) + insertionText + currentContent.slice(insertPos);
    const newCursorPos = insertPos + insertionText.length;

    // 3. Create persistent ManuscriptCitation records retaining stable links to selected ProjectReference records
    const now = new Date().toISOString();
    const msId = manuscript?.id || `ms_${project.id}`;
    const existingCitations = project.citations || [];

    const newCitations: ManuscriptCitation[] = selectedReferences.map((ref, idx) => ({
      id: `cite_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`,
      projectId: project.id,
      manuscriptId: msId,
      sectionId: targetSection.id,
      referenceId: ref.id,
      inTextTag: formattedTag,
      citationOrder: existingCitations.length + idx + 1,
      userId: userId || project.userId,
      createdAt: now,
    }));

    const allCitations = [...existingCitations, ...newCitations];

    // 4. Update section provenance list with referenceIds for traceability
    const refIds = selectedReferences.map((r) => r.id);
    const existingProvList = targetSection.provenanceList || [];
    let updatedProvenanceList = existingProvList.map((prov, pIdx) => {
      if (pIdx === 0) {
        const existingRefIds = prov.referenceIds || [];
        return {
          ...prov,
          referenceIds: Array.from(new Set([...existingRefIds, ...refIds])),
          provenanceType: 'literature_derived' as const,
        };
      }
      return prov;
    });

    if (updatedProvenanceList.length === 0) {
      updatedProvenanceList = [
        {
          paragraphId: `prov-${targetSection.id}-0`,
          paragraphIndex: 0,
          textSnippet: updatedContent.slice(0, 100),
          provenanceType: 'literature_derived',
          factIds: [],
          referenceIds: refIds,
          sourceLabels: selectedReferences.map((r) => r.title),
          userVerified: true,
        },
      ];
    }

    // 5. Build updated sections
    const updatedSections = (manuscript?.sections || []).map((s) => {
      if (s.id === targetSection.id) {
        return {
          ...s,
          content: updatedContent,
          wordCount: updatedContent.split(/\s+/).filter(Boolean).length,
          lastModified: now,
          provenanceList: updatedProvenanceList,
        };
      }
      return s;
    });

    const updatedProject: Project = {
      ...project,
      citations: allCitations,
      manuscript: manuscript
        ? {
            ...manuscript,
            sections: updatedSections,
            totalWordCount: updatedSections.reduce((acc, s) => acc + s.wordCount, 0),
            lastSaved: now,
          }
        : {
            id: msId,
            projectId: project.id,
            title: project.title,
            sections: updatedSections,
            totalWordCount: updatedSections.reduce((acc, s) => acc + s.wordCount, 0),
            formatId: project.formatId || 'fmt-nature-springer',
            lastSaved: now,
          },
      updatedAt: now,
    };

    // 6. Update project state
    onUpdateProject(updatedProject);

    // 7. Persist directly to Supabase
    if (!project.isDemoProject && userId) {
      newCitations.forEach((cite) => {
        saveManuscriptCitation(cite, userId).catch((err) =>
          console.warn('Supabase save citation warning:', err)
        );
      });
    }

    // 8. Focus editor and place cursor right after inserted citation
    setActiveSectionId(targetSection.id);
    setEditorCursorPosition(newCursorPos);
    setActiveTab('editor');

    setTimeout(() => {
      if (editorTextareaRef.current) {
        editorTextareaRef.current.focus();
        editorTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  const handleInsertReferenceToEditor = (refText: string) => {
    if (!activeSection) return;
    const currentContent = activeSection.content || '';
    const insertPos =
      editorCursorPosition !== null &&
      editorCursorPosition >= 0 &&
      editorCursorPosition <= currentContent.length
        ? editorCursorPosition
        : currentContent.length;

    const leadingSpace =
      insertPos > 0 && currentContent[insertPos - 1] !== ' ' && currentContent[insertPos - 1] !== '\n'
        ? ' '
        : '';
    const formattedText = `[${refText}]`;
    const insertion = `${leadingSpace}${formattedText} `;
    const updatedContent =
      currentContent.slice(0, insertPos) + insertion + currentContent.slice(insertPos);
    const newCursorPos = insertPos + insertion.length;

    handleSectionContentChange(updatedContent);
    setEditorCursorPosition(newCursorPos);
    setActiveTab('editor');

    setTimeout(() => {
      if (editorTextareaRef.current) {
        editorTextareaRef.current.focus();
        editorTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  const handleUpdateSectionMissingInfo = (sectionId: string, items: MissingInfoItem[]) => {
    if (!manuscript) return;
    const updatedSections = manuscript.sections.map((s) =>
      s.id === sectionId ? { ...s, missingInfo: items } : s
    );
    onUpdateProject({
      ...project,
      manuscript: {
        ...manuscript,
        sections: updatedSections,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddVerifiedFactFromScanner = (newFact: Partial<ResearchFact>) => {
    const fullFact: ResearchFact = {
      id: `fact-scanner-${Date.now()}`,
      projectId: project.id,
      category: (newFact.category as FactCategory) || 'Methodology',
      keyStatement: newFact.statement || '',
      statement: newFact.statement || '',
      value: newFact.value,
      unit: newFact.unit,
      userVerified: true,
      confidence: 'High',
      sourceRef: {
        sourceType: 'user_provided',
        sourceName: 'Supplied by Researcher via Completeness Scanner',
        timestamp: new Date().toISOString(),
      },
      provenanceType: 'user_fact',
      verificationStatus: 'VERIFIED',
    };
    onUpdateProject({
      ...project,
      facts: [...(project.facts || []), fullFact],
      updatedAt: new Date().toISOString(),
    });
  };

  // Regenerate an individual section with AI (direct fallback)
  const handleRegenerateSection = async (section: ManuscriptSection) => {
    handleOpenSectionRegenModal(section);
  };

  // Assistant action handler
  const handleRunAssistant = async (action: string) => {
    const textToProcess = selectedText.trim() || activeSection?.content || '';
    if (!textToProcess) {
      alert('Please select or draft some text first to run this assistant action.');
      return;
    }

    const check = checkPlanLimits({
      action: 'ai_analysis',
      currentPlan: activePlan,
      currentUsage: subscriptionState?.usage || { aiAnalysesThisMonth: 0, exportsThisMonth: 0 },
    });
    if (!check.allowed) {
      setUpgradeReason({
        title: 'Monthly AI Analysis Limit Reached',
        description: check.reason || `You have used your monthly AI quota (${check.limit} analyses) on the ${PLAN_CONFIGS[activePlan].name} tier. Upgrade for higher limits.`,
        targetPlan: activePlan === 'FREE' ? 'RESEARCHER' : 'PRO_RESEARCHER',
      });
      setShowUpgradeModal(true);
      return;
    }

    setAssistantLoading(true);
    setAssistantResult(null);
    setAssistantExplanation(null);

    try {
      const response = await runAssistantAction(
        action,
        textToProcess,
        activeSection?.title,
        project.title
      );
      setAssistantResult(response.result);
      setAssistantExplanation(response.explanation || null);
      if (onRecordUsage) onRecordUsage('ai_analysis');
    } catch (err: any) {
      setAssistantResult(`Error running action: ${err.message}`);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Apply assistant result into active section
  const handleApplyAssistantResult = () => {
    if (!assistantResult || !activeSection) return;
    if (selectedText.trim()) {
      const updated = activeSection.content.replace(selectedText, assistantResult);
      handleSectionContentChange(updated);
    } else {
      handleSectionContentChange(assistantResult);
    }
    setAssistantResult(null);
    setSelectedText('');
  };

  // Handle Export to DOCX
  const handleExportDocx = async () => {
    const check = checkPlanLimits({
      action: 'export',
      currentPlan: activePlan,
      currentUsage: subscriptionState?.usage || { aiAnalysesThisMonth: 0, exportsThisMonth: 0 },
    });
    if (!check.allowed) {
      setUpgradeReason({
        title: 'Monthly Export Limit Reached',
        description: check.reason || `You have reached the monthly export limit (${check.limit} exports/month) on the Free plan. Upgrade to Researcher for unlimited DOCX and PDF exports.`,
        targetPlan: 'RESEARCHER',
      });
      setShowUpgradeModal(true);
      return;
    }

    setIsExportingDocx(true);
    try {
      await exportManuscriptToDocx(project, activeFormattingProfile, activeCitationStyle);
      if (onRecordUsage) onRecordUsage('export');
    } catch (err: any) {
      alert(`DOCX export failed: ${err.message}`);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Handle Export to PDF
  const handleExportPdf = async () => {
    const check = checkPlanLimits({
      action: 'export',
      currentPlan: activePlan,
      currentUsage: subscriptionState?.usage || { aiAnalysesThisMonth: 0, exportsThisMonth: 0 },
    });
    if (!check.allowed) {
      setUpgradeReason({
        title: 'Monthly Export Limit Reached',
        description: check.reason || `You have reached the monthly export limit (${check.limit} exports/month) on the Free plan. Upgrade to Researcher for unlimited DOCX and PDF exports.`,
        targetPlan: 'RESEARCHER',
      });
      setShowUpgradeModal(true);
      return;
    }

    setIsExportingPdf(true);
    try {
      await exportManuscriptToPdf(project, activeFormattingProfile, activeCitationStyle);
      if (onRecordUsage) onRecordUsage('export');
    } catch (err: any) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Toggle Fact verification
  const handleToggleFactVerification = (factId: string) => {
    const currentFacts = project.facts || [];
    const updatedFacts = currentFacts.map((f) =>
      f.id === factId ? { ...f, userVerified: !f.userVerified } : f
    );
    onUpdateProject({
      ...project,
      facts: updatedFacts,
      updatedAt: new Date().toISOString()
    });
  };

  // Delete a fact
  const handleDeleteFact = (factId: string) => {
    const currentFacts = project.facts || [];
    const updatedFacts = currentFacts.filter((f) => f.id !== factId);
    onUpdateProject({
      ...project,
      facts: updatedFacts,
      updatedAt: new Date().toISOString()
    });
  };

  // Delete an uploaded file
  const handleDeleteFile = (fileId: string) => {
    const currentFiles = project.files || [];
    const updatedFiles = currentFiles.filter((f) => f.id !== fileId);
    onUpdateProject({
      ...project,
      files: updatedFiles,
      updatedAt: new Date().toISOString()
    });
  };

  // Add a new user-defined fact
  const handleCreateFact = () => {
    if (!newFactStatement.trim()) return;
    const newFact: ResearchFact = {
      id: `fact-user-${Date.now()}`,
      category: newFactCategory,
      keyStatement: newFactStatement.trim(),
      sourceRef: {
        sourceType: 'user_input',
        sourceName: 'User-Verified Field Addition',
        timestamp: new Date().toISOString()
      },
      provenanceType: 'user_fact',
      confidence: 'High',
      userVerified: true,
      dataValues: newFactValue.trim()
        ? [
            {
              label: 'User Metric',
              value: newFactValue.trim(),
              unit: newFactUnit.trim() || undefined,
              pValue: undefined
            }
          ]
        : undefined
    };

    onUpdateProject({
      ...project,
      facts: [newFact, ...(project.facts || [])],
      updatedAt: new Date().toISOString()
    });

    setNewFactStatement('');
    setNewFactValue('');
    setNewFactUnit('');
    setIsAddFactOpen(false);
  };

  // Run Multimodal AI File Analysis
  const handleAnalyzeFile = async (file: ResearchFile) => {
    const check = checkPlanLimits({
      action: 'ai_analysis',
      currentPlan: activePlan,
      currentUsage: subscriptionState?.usage || { aiAnalysesThisMonth: 0, exportsThisMonth: 0 },
    });
    if (!check.allowed) {
      setUpgradeReason({
        title: 'Monthly AI Analysis Limit Reached',
        description: check.reason || `You have reached your monthly AI quota (${check.limit} analyses) on the ${PLAN_CONFIGS[activePlan].name} tier. Upgrade for higher limits.`,
        targetPlan: activePlan === 'FREE' ? 'RESEARCHER' : 'PRO_RESEARCHER',
      });
      setShowUpgradeModal(true);
      return;
    }

    setAnalyzingFileId(file.id);
    try {
      const analysis = await analyzeResearchFile(file, {
        title: project.title,
        hypothesis: project.hypothesis,
        methodology: project.methodology
      });
      if (onRecordUsage) onRecordUsage('ai_analysis');

      const updatedFiles = (project.files || []).map((f) => {
        if (f.id === file.id) {
          return {
            ...f,
            aiAnalysis: analysis,
            extractedFactsCount: (analysis.keyFindings || []).length,
            extractedFactsSummary: analysis.summary
          };
        }
        return f;
      });

      // Also create facts from this analysis
      const newFactsFromFile: ResearchFact[] = (analysis.keyFindings || []).map(
        (finding: string, idx: number) => ({
          id: `fact-file-${file.id}-${idx}-${Date.now()}`,
          category: (file.category === 'Figure' || file.category === 'Image' ? 'Figure Finding' : 'Findings/Data') as FactCategory,
          keyStatement: finding,
          sourceRef: {
            sourceType: 'figure_or_file',
            sourceName: file.name,
            fileId: file.id,
            timestamp: new Date().toISOString()
          },
          provenanceType: 'user_fact',
          confidence: 'High',
          userVerified: true
        })
      );

      onUpdateProject({
        ...project,
        files: updatedFiles,
        facts: [...(project.facts || []), ...newFactsFromFile],
        updatedAt: new Date().toISOString()
      });

      setSelectedFileForModal({
        ...file,
        aiAnalysis: analysis,
        extractedFactsCount: (analysis.keyFindings || []).length,
        extractedFactsSummary: analysis.summary
      });
    } catch (err: any) {
      alert(`File analysis failed: ${err.message}`);
    } finally {
      setAnalyzingFileId(null);
    }
  };

  // Upload Research Material Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      // 1. Upload to Supabase Storage with userId and projectId folder structure
      const storageResult = await uploadResearchFileToSupabase(file, userId, project.id);
      const publicUrl = storageResult?.publicUrl || URL.createObjectURL(file);

      // 2. Read preview/content if text or image
      let contentSnippet = '';
      if (file.type.includes('text') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        contentSnippet = await file.text();
      }

      // 3. Format file size
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

      const newResearchFile: ResearchFile = {
        id: `file-${Date.now()}`,
        projectId: project.id,
        name: file.name,
        originalName: file.name,
        category: (uploadCategory || 'Figure') as any,
        type: file.type || 'application/octet-stream',
        size: file.size,
        sizeFormatted,
        uploadedAt: new Date().toISOString(),
        uploadStatus: 'ready',
        dataPreviewUrl: publicUrl,
        textContent: contentSnippet.slice(0, 5000),
        extractedFactsCount: 0
      };

      const updatedFiles = [...(project.files || []), newResearchFile];
      onUpdateProject({
        ...project,
        files: updatedFiles,
        updatedAt: new Date().toISOString()
      });

      // Clear input
      e.target.value = '';
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(`Failed to upload file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Save Version Snapshot
  const handleSaveSnapshot = async () => {
    setIsSavingSnapshot(true);
    try {
      const res = await createManuscriptVersion(project.id, {
        title: snapshotTitle.trim() || `Snapshot ${new Date().toLocaleDateString()}`,
        changeSummary: snapshotSummary.trim() || 'Manual working version capture',
        sections: project.manuscript?.sections || [],
        totalWordCount: project.manuscript?.totalWordCount || 0
      });

      if (res.project) {
        onUpdateProject(res.project);
      } else if (res.version) {
        onUpdateProject({
          ...project,
          versions: [res.version, ...(project.versions || [])]
        });
      }
      setIsSnapshotModalOpen(false);
      setSnapshotTitle('');
      setSnapshotSummary('');
    } catch (err: any) {
      alert(`Snapshot save failed: ${err.message}`);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Save Research Information updates
  const handleSaveProjectInfo = () => {
    const updated: Project = {
      ...project,
      title: editTitle,
      hypothesis: editHypothesis,
      methodology: editMethodology,
      studyPopulationSample: editPopulation,
      variables: editVariables,
      majorFindings: editFindings,
      conclusion: editConclusion,
      limitations: editLimitations,
      updatedAt: new Date().toISOString()
    };
    onUpdateProject(updated);
    setInfoSavedSuccess(true);
    setTimeout(() => setInfoSavedSuccess(false), 3000);
  };

  const primaryProvenance = activeSection?.provenanceList?.[0]?.provenanceType || 'user_fact';

  const getTagBadge = (tag?: ProvenanceType) => {
    switch (tag) {
      case 'user_fact':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            User Research Fact
          </span>
        );
      case 'literature_derived':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Literature Grounded
          </span>
        );
      case 'explanatory_prose':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            AI Explanatory Prose
          </span>
        );
      case 'ai_suggestion_unverified':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Verification Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            User Research Fact
          </span>
        );
    }
  };

  const filteredFacts = (project.facts || []).filter((f) => {
    const matchesCategory = factCategoryFilter === 'All' || f.category === factCategoryFilter;
    const matchesSearch =
      !factSearchQuery.trim() ||
      (f.keyStatement || '').toLowerCase().includes(factSearchQuery.toLowerCase()) ||
      (f.sourceRef?.sourceName || f.source || '').toLowerCase().includes(factSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      {/* Top Workspace Header - High Density */}
      <div className="bg-white border border-[#141414] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
            <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#141414] text-white">
              {project.documentTypeId.replace(/_/g, ' ')}
            </span>
            <span className="text-[#141414] font-bold">• Profile: {activeFormattingProfile.name}</span>
            <span className="text-[#555]">• Citation: {activeCitationStyle}</span>
            <span className="text-[#555]">• Margins: {activeFormattingProfile.pageMargins.left} L</span>
          </div>
          <h1 className="text-lg sm:text-xl font-serif-academic font-bold text-[#141414] leading-snug">
            {project.title}
          </h1>
          <p className="text-xs text-[#555] font-sans-ui">
            {project.researchArea} {project.subField ? `| ${project.subField}` : ''}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cloud Autosave Indicator */}
          <AutosaveIndicator
            status={autosaveStatus}
            lastSavedAt={lastSavedAt}
            onRetry={onRetrySave}
            onManualSave={onManualSave}
          />

          {/* Layout Preview Quick Button */}
          <button
            onClick={() => setActiveTab(activeTab === 'layout_preview' ? 'editor' : 'layout_preview')}
            className={`px-3 py-1.5 text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer font-mono ${
              activeTab === 'layout_preview'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-white hover:bg-[#E9E8E5] text-[#141414] border-[#141414]'
            }`}
            title="Toggle Manuscript Page Layout Preview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Layout Preview</span>
          </button>

          {/* Provenance Toggle */}
          <button
            id="ws-provenance-toggle"
            onClick={() => setShowProvenanceTags(!showProvenanceTags)}
            className={`px-3 py-1.5 text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer font-mono ${
              showProvenanceTags
                ? 'bg-emerald-100 border-emerald-800 text-emerald-950'
                : 'bg-white border-[#141414] text-[#141414] hover:bg-[#E9E8E5]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Provenance {showProvenanceTags ? 'ON' : 'OFF'}
          </button>

          {/* Snapshot Button */}
          <button
            onClick={() => setIsSnapshotModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] transition-colors flex items-center gap-1 cursor-pointer font-mono"
            title="Save version snapshot"
          >
            <Save className="w-3.5 h-3.5 text-[#141414]" />
            Snapshot
          </button>

          {/* Quick Jump to Quality */}
          <button
            id="ws-quick-quality-btn"
            onClick={onNavigateToQualityChecks}
            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] transition-colors flex items-center gap-1 cursor-pointer font-mono"
          >
            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
            Quality Checks ({project.qualityReport?.overallScore || 95}%)
          </button>

          {/* Plan Quota Badge */}
          {currentPlan === 'FREE' ? (
            <button
              onClick={() => {
                setUpgradeReason({
                  title: 'Upgrade to Researcher',
                  description: 'Free plan includes 2 exports/month and 10 AI analyses/month. Upgrade for unlimited exports, all citation styles, and higher limits.',
                  targetPlan: 'RESEARCHER',
                });
                setShowUpgradeModal(true);
              }}
              className="px-2.5 py-1 text-[10px] font-mono font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
              title="Click to view plan limits and upgrade"
            >
              <span>FREE ({Math.max(0, 2 - (subscriptionState?.usage.exportsThisMonth || 0))}/2 exports left)</span>
              <span className="underline font-sans font-semibold">Upgrade</span>
            </button>
          ) : currentPlan === 'RESEARCHER' ? (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
              RESEARCHER • UNLIMITED EXPORTS
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">
              PRO RESEARCHER • UNLIMITED
            </span>
          )}

          {/* Export Buttons */}
          <button
            id="ws-export-docx-btn"
            onClick={handleExportDocx}
            disabled={isExportingDocx || isExportingPdf}
            className="bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-bold px-3 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-mono"
            title={`Export formatted manuscript as DOCX using ${activeFormattingProfile.name} profile`}
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingDocx ? 'Exporting DOCX...' : 'Export DOCX'}
          </button>

          <button
            id="ws-export-pdf-btn"
            onClick={handleExportPdf}
            disabled={isExportingDocx || isExportingPdf}
            className="bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-bold px-3 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-mono"
            title={`Export formatted manuscript as PDF using ${activeFormattingProfile.name} profile`}
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Workspace Navigation Bar - High Density Tabs */}
      <div className="bg-[#F0EFED] border border-[#141414] p-1 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Manuscript Editor
        </button>

        <button
          onClick={() => setActiveTab('layout_preview')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'layout_preview'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Layout Preview
        </button>

        <button
          onClick={() => setActiveTab('formatting_profile')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'formatting_profile'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Formatting Profiles ({activeFormattingProfile.shortName})
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'analysis'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Research Analysis
        </button>

        <button
          onClick={() => setActiveTab('facts')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'facts'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Research Facts ({(project.facts || []).filter((f) => f.userVerified || f.verificationStatus === 'VERIFIED').length}/{(project.facts || []).length})
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'references'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Literature References ({(project.references || []).length})
        </button>

        <button
          onClick={() => setActiveTab('figures')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'figures'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Figures & Tables ({(project.figures || []).length + (project.tables || []).length})
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Structured Record
        </button>

        <button
          onClick={() => setActiveTab('plan')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'plan'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Manuscript Plan ({project.plan?.sections?.length || sections.length})
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'files'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Research Files ({(project.files || []).length})
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'info'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          Research Info
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'versions'
              ? 'bg-[#141414] text-white'
              : 'text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Version History ({(project.versions || []).length})
        </button>
      </div>

      {/* TAB 1: MANUSCRIPT EDITOR */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Sections Navigation */}
          <div className="lg:col-span-3 bg-[#F0EFED] border border-[#141414] p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-[#141414] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#141414] flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5" />
                Outline ({sections.length})
              </span>
              <button
                id="ws-add-section-btn"
                onClick={handleAddSection}
                className="text-[#141414] hover:bg-[#E4E3E0] p-1 border border-[#141414] transition-colors cursor-pointer"
                title="Add Section"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-[580px] overflow-y-auto pr-1">
              {sections.map((sec, idx) => (
                <div key={sec.id} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`flex-1 text-left p-2 text-xs transition-all flex items-center justify-between cursor-pointer border ${
                      activeSectionId === sec.id
                        ? 'bg-[#141414] border-[#141414] text-white font-bold'
                        : 'bg-white border-[#141414]/20 text-[#141414] hover:border-[#141414]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className={`text-[10px] font-mono mr-1.5 ${activeSectionId === sec.id ? 'text-gray-300' : 'text-[#666]'}`}>
                        {idx + 1}.
                      </span>
                      <span>{sec.title}</span>
                    </div>
                    <span className={`text-[10px] font-mono shrink-0 ${activeSectionId === sec.id ? 'text-gray-300' : 'text-[#666]'}`}>
                      {sec.wordCount}w
                    </span>
                  </button>
                  <button
                    onClick={() => handleRegenerateSection(sec)}
                    disabled={regeneratingSection === sec.id}
                    title="Regenerate section with AI"
                    className="opacity-0 group-hover:opacity-100 absolute right-14 text-gray-500 hover:text-black p-1 transition-opacity cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${regeneratingSection === sec.id ? 'animate-spin text-black' : ''}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Format limit status */}
            <div className="bg-white p-3 border border-[#141414] text-[11px] space-y-1.5 text-[#141414]">
              <div className="flex justify-between">
                <span className="font-semibold">Total Words:</span>
                <span className="font-bold font-mono">{manuscript?.totalWordCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Target Budget:</span>
                <span className="font-mono">{formatSpec.wordLimit.max} words</span>
              </div>
              <div className="w-full bg-[#E4E3E0] h-1.5 overflow-hidden mt-1.5 border border-[#141414]/20">
                <div
                  className="bg-[#141414] h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (((manuscript?.totalWordCount || 0) / formatSpec.wordLimit.max) * 100)
                    )}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Center Column: Academic Document Editor & Paper Sheet Presentation */}
          <div className="lg:col-span-6 bg-white border border-[#141414] p-6 space-y-5 shadow-[4px_4px_0px_rgba(20,20,20,0.06)]">
            {/* Section Header & Provenance Badge */}
            <div className="flex items-center justify-between border-b border-[#141414] pb-3">
              <div>
                <h2 className="text-base font-serif-academic font-bold text-[#141414]">{activeSection?.title}</h2>
                <span className="text-[11px] text-[#555] font-mono">
                  {activeSection?.wordCount || 0} words &bull; Section {sections.findIndex((s) => s.id === activeSectionId) + 1} of {sections.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => activeSection && handleRegenerateSection(activeSection)}
                  disabled={Boolean(regeneratingSection)}
                  className="text-[11px] px-2.5 py-1 bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] flex items-center gap-1 transition-colors cursor-pointer font-mono font-bold"
                >
                  <RefreshCw className={`w-3 h-3 ${regeneratingSection === activeSection?.id ? 'animate-spin text-black' : ''}`} />
                  Regenerate
                </button>
                {showProvenanceTags && getTagBadge(primaryProvenance)}
              </div>
            </div>

            {/* Traceability Banner if enabled */}
            {showProvenanceTags && (
              <div className="bg-[#FAF9F7] p-3 border border-[#141414] text-xs space-y-1">
                <div className="flex items-center justify-between text-[#141414] font-bold font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-800 text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Fact Integrity Status:
                  </span>
                  <span className="text-[11px] text-[#555]">Preserved from Primary Inputs</span>
                </div>
                <p className="text-[11px] text-[#555] leading-relaxed font-sans-ui">
                  Values, sample metrics, and methodology parameters in this section are directly derived from user submissions and verified citations.
                </p>
              </div>
            )}

            {/* Manuscript Formatting Profile & Citation Style Toolbar */}
            <div className="bg-[#F0EFED] border border-[#141414] p-3 space-y-2.5">
              {/* Profile Selector Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-[#141414]/15 pb-2.5">
                <FormatProfileSelector
                  project={project}
                  activeProfile={activeFormattingProfile}
                  onSelectProfile={handleSelectFormattingProfile}
                  onUpdateCustomProfile={handleUpdateCustomProfile}
                  onOpenPreview={() => setActiveTab('layout_preview')}
                  compact={true}
                />
              </div>

              {/* Citation Style & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <CitationStyleSelector
                  currentStyle={activeCitationStyle}
                  onStyleChange={handleCitationStyleChange}
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Toggle between Raw Markdown Editor and Live Formatted Academic View */}
                  <button
                    onClick={() => setIsFormattedCitationPreview(!isFormattedCitationPreview)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isFormattedCitationPreview
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white hover:bg-[#E9E8E5] text-[#141414] border-[#141414]'
                    }`}
                    title="Toggle between raw editor and formatted in-text citation preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isFormattedCitationPreview ? 'Viewing Formatted' : 'Live Citation View'}</span>
                  </button>

                  <button
                    onClick={handleFormatAllInTextTags}
                    className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Reformat in-text tags in all sections to match ${activeCitationStyle} syntax`}
                  >
                    <Sparkles className="w-3 h-3 text-[#141414]" />
                    <span>Format Tags to {activeCitationStyle}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('references')}
                    className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-[#E9E8E5] text-[#141414] border border-[#141414] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Open Literature Library to insert citations"
                  >
                    <Bookmark className="w-3 h-3 text-[#141414]" />
                    <span>+ Insert Cite</span>
                  </button>
                </div>
              </div>

              {citationFormatNotice && (
                <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{citationFormatNotice}</span>
                </div>
              )}
            </div>

            {/* Academic Textarea Editor or Live Formatted Citation View */}
            <div>
              {isFormattedCitationPreview ? (
                <div className="w-full bg-[#FAF9F7] border border-[#141414] p-5 text-[#141414] font-serif-academic text-sm leading-relaxed space-y-3 min-h-[360px]">
                  <div className="flex items-center justify-between border-b border-[#141414]/20 pb-2 mb-2 font-mono text-xs">
                    <span className="font-bold text-[#141414] uppercase flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Live Formatted Preview &bull; {activeCitationStyle} Citations
                    </span>
                    <span className="text-[10px] text-[#666]">Read-Only Formatted View</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed select-text">
                    {renderManuscriptWithFormattedCitations(
                      activeSection?.content || '',
                      project,
                      activeCitationStyle
                    ) || <span className="text-gray-400 italic">No section content to render.</span>}
                  </div>
                </div>
              ) : (
                <textarea
                  ref={editorTextareaRef}
                  rows={16}
                  value={activeSection?.content || ''}
                  onChange={(e) => {
                    handleSectionContentChange(e.target.value);
                    setEditorCursorPosition(e.target.selectionStart);
                  }}
                  onClick={(e) => {
                    const target = e.currentTarget;
                    setEditorCursorPosition(target.selectionStart);
                    if (target.selectionStart !== target.selectionEnd) {
                      setSelectedText(target.value.substring(target.selectionStart, target.selectionEnd));
                    }
                  }}
                  onKeyUp={(e) => {
                    const target = e.currentTarget;
                    setEditorCursorPosition(target.selectionStart);
                    if (target.selectionStart !== target.selectionEnd) {
                      setSelectedText(target.value.substring(target.selectionStart, target.selectionEnd));
                    }
                  }}
                  onSelect={(e) => {
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    setEditorCursorPosition(start);
                    if (start !== end) {
                      setSelectedText(target.value.substring(start, end));
                    }
                  }}
                  className="w-full bg-[#FAF9F7] border border-[#141414]/30 focus:border-[#141414] p-4 text-[#141414] font-serif-academic text-sm leading-relaxed focus:outline-none resize-y"
                  placeholder="Draft section content..."
                />
              )}
            </div>

            {/* Active Section Citations & Provenance Summary Bar */}
            {(() => {
              const { refToOrderMap } = extractCitedReferences(project);
              const activeSectionCitations = (project.citations || []).filter((c) => c.sectionId === activeSectionId);
              const activeSectionRefIds = new Set<string>([
                ...activeSectionCitations.map((c) => c.referenceId),
                ...((activeSection?.provenanceList || []).flatMap((p) => p.referenceIds || []))
              ]);
              const activeSectionRefs = (project.references || []).filter((r) => activeSectionRefIds.has(r.id));

              if (activeSectionRefs.length === 0) return null;

              return (
                <div className="bg-[#FAF9F7] border border-[#141414] p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold uppercase text-[#141414] text-[11px] flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-[#141414]" />
                      Section Citations ({activeSectionRefs.length}) &bull; {activeCitationStyle} Format:
                    </span>
                    <span className="text-[10px] text-[#666]">
                      {activeSectionCitations.length} linked record{activeSectionCitations.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSectionRefs.map((r) => {
                      const inText = formatInTextCitation([r], activeCitationStyle, refToOrderMap);
                      return (
                        <div
                          key={r.id}
                          className="bg-white border border-[#141414] px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]"
                          title={`${r.title} (${r.publicationYear || 'n.d.'})`}
                        >
                          <span className="font-bold bg-[#141414] text-white px-1 py-0.2 text-[10px]">
                            {inText}
                          </span>
                          <span className="truncate max-w-[200px] text-[#141414]">
                            {r.authors?.[0]?.lastName || 'Author'} ({r.publicationYear || 'n.d.'})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Project Figures */}
            {project.figures && project.figures.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#141414]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414] font-mono">
                  Associated Scientific Figures ({project.figures.length})
                </h3>
                {project.figures.map((fig) => (
                  <div key={fig.id} className="bg-[#FAF9F7] border border-[#141414] p-4 space-y-2">
                    <div className="aspect-video bg-white border border-[#141414]/30 flex items-center justify-center text-gray-400 relative overflow-hidden">
                      {fig.imageUrl ? (
                        <img src={fig.imageUrl} alt={fig.caption} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center p-4">
                          <FileText className="w-8 h-8 text-[#141414] mx-auto mb-1" />
                          <span className="text-xs font-mono text-[#141414]">[Figure {fig.figureNumber}: {fig.title}]</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-[#141414] font-serif-academic">
                      <strong className="font-sans-ui font-bold">Figure {fig.figureNumber}: </strong>
                      {fig.caption}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Project Tables */}
            {project.tables && project.tables.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#141414]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414] font-mono">
                  Associated Empirical Tables ({project.tables.length})
                </h3>
                {project.tables.map((tbl) => (
                  <div key={tbl.id} className="bg-[#FAF9F7] border border-[#141414] p-4 space-y-2">
                    <div className="text-xs font-bold text-[#141414] font-mono">
                      Table {tbl.tableNumber}: {tbl.title}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-[#141414]">
                        <thead className="bg-[#F0EFED] text-[#141414]">
                          <tr>
                            {tbl.headers.map((h, i) => (
                              <th key={i} className="p-2 border-b border-r border-[#141414] font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#141414]/20 font-mono text-[11px] text-[#141414]">
                          {tbl.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2 border-r border-[#141414]/20">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generated References & Bibliography Section */}
            <div className="pt-4 border-t border-[#141414]">
              <ManuscriptReferencesSection
                project={project}
                citationStyle={activeCitationStyle}
                onCitationStyleChange={handleCitationStyleChange}
                onNavigateToLiteratureLibrary={() => setActiveTab('references')}
                onAppendReferencesToManuscript={handleAppendReferencesToManuscript}
              />
            </div>
          </div>

          {/* Right Column: Assistant & Fact Inspector */}
          <div className="lg:col-span-3 bg-[#F0EFED] border border-[#141414] p-3 space-y-3">
            {/* Sub-Tabs */}
            <div className="flex border-b border-[#141414] pb-1 gap-1">
              <button
                onClick={() => setActiveRightTab('assistant')}
                className={`flex-1 py-1.5 text-xs font-bold text-center transition-colors cursor-pointer font-mono ${
                  activeRightTab === 'assistant' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#E4E3E0]'
                }`}
              >
                Academic Tools
              </button>
              <button
                onClick={() => setActiveRightTab('facts')}
                className={`flex-1 py-1.5 text-xs font-bold text-center transition-colors cursor-pointer font-mono ${
                  activeRightTab === 'facts' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#E4E3E0]'
                }`}
              >
                Facts ({project.facts?.length || 0})
              </button>
              <button
                onClick={() => setActiveRightTab('plan')}
                className={`flex-1 py-1.5 text-xs font-bold text-center transition-colors cursor-pointer font-mono ${
                  activeRightTab === 'plan' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#E4E3E0]'
                }`}
              >
                Plan Specs
              </button>
            </div>

            {activeRightTab === 'assistant' ? (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#141414] block font-mono">
                    Scholarly Transformations
                  </span>
                  <p className="text-[11px] text-[#555]">
                    {selectedText ? 'Will apply to highlighted text snippet.' : 'Will apply to current active section.'}
                  </p>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleRunAssistant('improve_academic_style')}
                    disabled={assistantLoading}
                    className="p-2 bg-white hover:bg-[#E9E8E5] border border-[#141414] text-[#141414] text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#141414] mb-1" />
                    <span className="font-bold block text-[11px]">Academic Style</span>
                  </button>

                  <button
                    onClick={() => handleRunAssistant('check_claim')}
                    disabled={assistantLoading}
                    className="p-2 bg-white hover:bg-[#E9E8E5] border border-[#141414] text-[#141414] text-left transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 mb-1" />
                    <span className="font-bold block text-[11px]">Hedge Claims</span>
                  </button>

                  <button
                    onClick={() => handleRunAssistant('condense')}
                    disabled={assistantLoading}
                    className="p-2 bg-white hover:bg-[#E9E8E5] border border-[#141414] text-[#141414] text-left transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-700 mb-1" />
                    <span className="font-bold block text-[11px]">Synthesize</span>
                  </button>

                  <button
                    onClick={() => handleRunAssistant('figure_caption')}
                    disabled={assistantLoading}
                    className="p-2 bg-white hover:bg-[#E9E8E5] border border-[#141414] text-[#141414] text-left transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-[#141414] mb-1" />
                    <span className="font-bold block text-[11px]">Fig. Caption</span>
                  </button>

                  <button
                    onClick={() => handleRunAssistant('table_caption')}
                    disabled={assistantLoading}
                    className="p-2 bg-white hover:bg-[#E9E8E5] border border-[#141414] text-[#141414] text-left transition-colors cursor-pointer"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-[#141414] mb-1" />
                    <span className="font-bold block text-[11px]">Table Caption</span>
                  </button>

                  <button
                    onClick={() => handleRunAssistant('find_missing_info')}
                    disabled={assistantLoading}
                    className="p-2 bg-white hover:bg-[#E9E8E5] border border-[#141414] text-[#141414] text-left transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-rose-700 mb-1" />
                    <span className="font-bold block text-[11px]">Missing Info</span>
                  </button>
                </div>

                {/* Assistant Output Result Box */}
                {assistantLoading ? (
                  <div className="p-4 bg-white border border-[#141414] text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-[#141414] animate-spin mx-auto" />
                    <span className="text-xs text-[#555] block font-mono">Processing academic transformation...</span>
                  </div>
                ) : assistantResult ? (
                  <div className="bg-white border border-[#141414] p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#141414] pb-1">
                      <span className="font-bold text-[#141414] font-mono">Proposal Result</span>
                      <button
                        onClick={() => setAssistantResult(null)}
                        className="text-[#666] hover:text-black cursor-pointer font-bold"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-[#141414] font-serif-academic leading-relaxed text-xs whitespace-pre-wrap">
                      {assistantResult}
                    </p>
                    {assistantExplanation && (
                      <div className="text-[10px] text-[#555] border-t border-[#141414]/20 pt-1 italic font-sans-ui">
                        {assistantExplanation}
                      </div>
                    )}
                    <button
                      onClick={handleApplyAssistantResult}
                      className="w-full py-1.5 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-bold transition-colors cursor-pointer font-mono"
                    >
                      Apply Changes to Document
                    </button>
                  </div>
                ) : null}
              </div>
            ) : activeRightTab === 'facts' ? (
              /* Facts Tab in Right Drawer */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Verified Facts
                  </span>
                  <button
                    onClick={() => setActiveTab('facts')}
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {(project.facts || []).slice(0, 8).map((fact) => (
                    <div key={fact.id} className="p-2.5 rounded-md bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-sm bg-slate-800 text-emerald-300">
                          {fact.category}
                        </span>
                        <button
                          onClick={() => handleToggleFactVerification(fact.id)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            fact.userVerified
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {fact.userVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-snug font-serif-academic">{fact.keyStatement}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Plan Specs Tab in Right Drawer */
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Manuscript Blueprint Specs
                  </span>
                  <p className="text-[10px] text-slate-500 font-sans-ui">
                    Targeted structure for {docTypeSpec.title}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Budget:</span>
                    <span className="font-mono text-white">{project.plan?.totalTargetWordCount || formatSpec.wordLimit.max} words</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Sections:</span>
                    <span className="font-mono text-white">{project.plan?.sections?.length || sections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Citation Style:</span>
                    <span className="font-mono text-indigo-300">{formatSpec.citationStyle}</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {(project.plan?.sections || []).map((sec, idx) => (
                    <div key={sec.sectionId} className="p-2 bg-slate-950 border border-slate-800/80 rounded text-[11px]">
                      <div className="font-semibold text-slate-200">{idx + 1}. {sec.title}</div>
                      <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                        <span>Target: {sec.targetWordCount} words</span>
                        <span>{sec.requiredFactsCount} facts assigned</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: AI RESEARCH ANALYSIS (PHASE 2B) */}
      {activeTab === 'analysis' && (
        <ResearchAnalysisWorkspace
          project={project}
          onUpdateProject={onUpdateProject}
          onNavigateToFactsTab={() => setActiveTab('facts')}
          userId={userId}
        />
      )}

      {/* TAB: VERIFIED RESEARCH FACTS (PHASE 2B) */}
      {activeTab === 'facts' && (
        <FactVerificationView
          project={project}
          onUpdateProject={onUpdateProject}
          onNavigateToAnalysis={() => setActiveTab('analysis')}
          userId={userId}
        />
      )}

      {/* TAB 3: STRUCTURED RESEARCH RECORD */}
      {activeTab === 'summary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              Structured Research Record
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified synthesis matrix correlating hypothesis, experimental protocols, numerical findings, and conclusions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Hypothesis & Research Question */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                1. Hypothesis & Study Questions
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">Hypothesis:</span>
                  <p className="text-slate-200 font-serif-academic">
                    {project.summary?.coreHypothesis || project.hypothesis || 'Hypothesis established from initial project inputs.'}
                  </p>
                </div>
                {project.researchQuestions && (
                  <div>
                    <span className="text-slate-500 font-mono text-[10px] block">Research Question:</span>
                    <p className="text-slate-300 font-serif-academic">{project.researchQuestions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Methodology & Cohort */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                2. Experimental Design & Population
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">Methodology:</span>
                  <p className="text-slate-200 font-mono text-[11px] leading-relaxed">
                    {project.summary?.methodologyFramework || project.methodology || 'Documented laboratory protocol.'}
                  </p>
                </div>
                {project.studyPopulationSample && (
                  <div>
                    <span className="text-slate-500 font-mono text-[10px] block">Population / Cohort:</span>
                    <p className="text-slate-300 font-mono text-[11px]">{project.studyPopulationSample}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Key Empirical Findings */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                3. Key Quantitative Findings
              </span>
              <ul className="space-y-2 text-xs">
                {(project.summary?.primaryFindings || [project.majorFindings || 'Observed experimental outcomes.']).map(
                  (finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-200 font-serif-academic">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{finding}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Conclusions & Limitations */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                4. Deductions & Boundary Limitations
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">Conclusion:</span>
                  <p className="text-slate-200 font-serif-academic">
                    {project.summary?.conclusionsDrawn || project.conclusion || 'Substantiated by verified data.'}
                  </p>
                </div>
                {project.limitations && (
                  <div>
                    <span className="text-slate-500 font-mono text-[10px] block">Limitations:</span>
                    <p className="text-slate-400 font-serif-academic">{project.limitations}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MANUSCRIPT PLAN */}
      {activeTab === 'plan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Manuscript Section Plan & Structure Blueprint
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted structural breakdown calibrated to {formatSpec.name} ({formatSpec.wordLimit.min} - {formatSpec.wordLimit.max} words).
              </p>
            </div>
            <button
              onClick={handleAddSection}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Planned Section
            </button>
          </div>

          <div className="space-y-3">
            {(project.plan?.sections || sections).map((sec: any, idx: number) => (
              <div
                key={sec.sectionId || sec.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-indigo-400">Section {idx + 1}.</span>
                    <h3 className="text-sm font-semibold text-white">{sec.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-sans-ui">
                    {sec.purpose || 'Synthesizes documented findings into publication prose.'}
                  </p>
                  {sec.guidelines && (
                    <span className="text-[11px] text-slate-500 font-mono block">
                      Guidelines: {sec.guidelines}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Target Budget:</span>
                    <span className="text-slate-200">{sec.targetWordCount || sec.wordCount || 500} words</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Assigned Facts:</span>
                    <span className="text-emerald-400">{sec.requiredFactsCount || 2} facts</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSectionId(sec.sectionId || sec.id);
                      setActiveTab('editor');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-sans-ui font-medium transition-colors cursor-pointer"
                  >
                    Open in Editor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: RESEARCH FILES & MULTIMODAL ANALYSIS */}
      {activeTab === 'files' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                Research Materials & Multimodal Analysis
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload raw graphs, microscope images, tables, and datasets. AI extracts visual evidence with non-fabrication constraints.
              </p>
            </div>

            {/* File Upload Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Figure">Figure / Chart</option>
                <option value="Table">Empirical Table</option>
                <option value="Dataset">Dataset / Raw CSV</option>
                <option value="Protocol">Method Protocol</option>
              </select>

              <label className={`px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${isUploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingFile ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploadingFile}
                  className="hidden"
                  accept="image/*,.csv,.json,.pdf,.txt,.tsv"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(project.files || []).map((file) => (
              <div
                key={file.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                      {file.category === 'Figures' || file.category === 'Images' ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white">{file.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {file.sizeFormatted} • <span className="text-indigo-300">{file.category}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyzeFile(file)}
                      disabled={analyzingFileId === file.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Cpu className={`w-3.5 h-3.5 ${analyzingFileId === file.id ? 'animate-spin' : ''}`} />
                      {analyzingFileId === file.id ? 'Analyzing...' : 'Run AI Inspection'}
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors cursor-pointer"
                      title="Remove File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Analysis Card */}
                {file.aiAnalysis ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        AI Multimodal Inspection Complete
                      </span>
                      <span className="font-mono text-slate-400">{file.aiAnalysis.visualType}</span>
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed font-serif-academic">
                      {file.aiAnalysis.summary}
                    </p>

                    {file.aiAnalysis.keyFindings && file.aiAnalysis.keyFindings.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Extracted Findings:</span>
                        <ul className="space-y-1">
                          {file.aiAnalysis.keyFindings.map((kf: string, idx: number) => (
                            <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                              <span className="text-indigo-400">•</span>
                              <span>{kf}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
                    Ready for analysis. Click &quot;Run AI Inspection&quot; to extract axes, observed data points, and statistical metrics.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: LITERATURE REFERENCES (PHASE 4.1) */}
      {activeTab === 'references' && (
        <ReferenceLibraryWorkspace
          project={project}
          onUpdateProject={onUpdateProject}
          userId={userId}
          onInsertCitation={handleInsertCitation}
          onInsertReferenceToEditor={handleInsertReferenceToEditor}
          currentPlan={currentPlan}
          onPlanUpgraded={onPlanUpgraded}
          onNavigateToPricing={onNavigateToPricing}
        />
      )}

      {/* TAB: FIGURES & TABLES */}
      {activeTab === 'figures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <FiguresAndTablesWorkspace
            project={project}
            onUpdateProject={onUpdateProject}
            onInsertReferenceToEditor={(refText) => {
              if (activeSection) {
                handleSectionContentChange((activeSection.content || '') + `\n\n${refText}`);
                setActiveTab('editor');
              }
            }}
          />
        </div>
      )}

      {/* TAB 6: RESEARCH INFORMATION EDITABLE */}
      {activeTab === 'info' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                Research Information & Metadata
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update core hypothesis, population metrics, empirical variables, or limitations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {infoSavedSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-4 h-4" /> Changes saved!
                </span>
              )}
              <button
                onClick={handleSaveProjectInfo}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Research Project Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Theoretical Hypothesis</label>
                <textarea
                  rows={3}
                  value={editHypothesis}
                  onChange={(e) => setEditHypothesis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Methodology & Protocols</label>
                <textarea
                  rows={3}
                  value={editMethodology}
                  onChange={(e) => setEditMethodology(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Study Population / Cohort / Sample Size</label>
                <textarea
                  rows={3}
                  value={editPopulation}
                  onChange={(e) => setEditPopulation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Independent & Dependent Variables</label>
                <textarea
                  rows={3}
                  value={editVariables}
                  onChange={(e) => setEditVariables(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Major Findings & Numerical Results</label>
                <textarea
                  rows={4}
                  value={editFindings}
                  onChange={(e) => setEditFindings(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Core Conclusion & Limitations</label>
                <textarea
                  rows={4}
                  value={editConclusion}
                  onChange={(e) => setEditConclusion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: VERSION HISTORY */}
      {activeTab === 'versions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400" />
                Manuscript Version History & Audit Trail
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Snapshot immutable milestones to track manuscript evolution and ensure scholarly reproducible history.
              </p>
            </div>
            <button
              onClick={() => setIsSnapshotModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save New Snapshot
            </button>
          </div>

          <div className="space-y-3">
            {(project.versions || []).length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
                No saved snapshot versions yet. Click &quot;Save New Snapshot&quot; to preserve your current working state.
              </div>
            ) : (
              (project.versions || []).map((ver) => (
                <div
                  key={ver.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        v{ver.versionNumber}
                      </span>
                      <h3 className="text-xs font-semibold text-white">{ver.title}</h3>
                      <span className="text-slate-500 text-xs font-mono">
                        • {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{ver.changeSummary}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Sections:</span>
                      <span className="text-white">{ver.sections.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Word Count:</span>
                      <span className="text-indigo-300">{ver.totalWordCount}w</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Quality Score:</span>
                      <span className="text-emerald-400">{ver.qualityScore}%</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Restore manuscript to snapshot "${ver.title}"?`)) {
                          onUpdateProject({
                            ...project,
                            manuscript: {
                              abstract: project.manuscript?.abstract || '',
                              keywords: project.manuscript?.keywords || [],
                              sections: ver.sections,
                              totalWordCount: ver.totalWordCount
                            },
                            updatedAt: new Date().toISOString()
                          });
                          setActiveTab('editor');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-sans-ui font-medium transition-colors cursor-pointer"
                    >
                      Restore Snapshot
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: LAYOUT PREVIEW */}
      {activeTab === 'layout_preview' && (
        <ManuscriptLayoutPreview
          project={project}
          activeProfile={activeFormattingProfile}
          onSelectProfile={handleSelectFormattingProfile}
          onClose={() => setActiveTab('editor')}
        />
      )}

      {/* TAB: FORMATTING PROFILES */}
      {activeTab === 'formatting_profile' && (
        <FormatProfileSelector
          project={project}
          activeProfile={activeFormattingProfile}
          onSelectProfile={handleSelectFormattingProfile}
          onUpdateCustomProfile={handleUpdateCustomProfile}
          onOpenPreview={() => setActiveTab('layout_preview')}
        />
      )}

      {/* Add Fact Modal */}
      {isAddFactOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-white">Add New Verifiable Research Fact</h3>
            <p className="text-xs text-slate-400">
              Direct empirical data is protected from AI modification.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <select
                  value={newFactCategory}
                  onChange={(e) => setNewFactCategory(e.target.value as FactCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Hypothesis">Hypothesis</option>
                  <option value="Methodology">Methodology</option>
                  <option value="Population/Sample">Population/Sample</option>
                  <option value="Variables">Variables</option>
                  <option value="Findings/Data">Findings/Data</option>
                  <option value="Conclusion">Conclusion</option>
                  <option value="Limitations">Limitations</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fact Statement</label>
                <textarea
                  rows={3}
                  placeholder="e.g., At 14 days, tumor volume in the hydrogel cohort was 112 ± 18 mm3 compared to 540 ± 62 mm3 in the control (p < 0.001)..."
                  value={newFactStatement}
                  onChange={(e) => setNewFactStatement(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Numerical Value (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., 112 ± 18"
                    value={newFactValue}
                    onChange={(e) => setNewFactValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., mm3, %, uM"
                    value={newFactUnit}
                    onChange={(e) => setNewFactUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddFactOpen(false)}
                className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFact}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold"
              >
                Save Fact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Snapshot Modal */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-white">Save Version Snapshot</h3>
            <p className="text-xs text-slate-400">
              Create an immutable snapshot milestone of the current manuscript state.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Snapshot Title</label>
                <input
                  type="text"
                  placeholder="e.g., Draft prior to peer review submission"
                  value={snapshotTitle}
                  onChange={(e) => setSnapshotTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Change Summary</label>
                <textarea
                  rows={3}
                  placeholder="e.g., Incorporated reviewer feedback on statistical confidence and clarified microscopy caption..."
                  value={snapshotSummary}
                  onChange={(e) => setSnapshotSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsSnapshotModalOpen(false)}
                className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSnapshot}
                disabled={isSavingSnapshot}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-semibold"
              >
                {isSavingSnapshot ? 'Saving...' : 'Create Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonTitle={upgradeReason.title}
        reasonDescription={upgradeReason.description}
        targetPlan={upgradeReason.targetPlan}
        currentPlan={currentPlan}
        userProfile={userProfile || null}
        userId={userId}
        onPlanUpgraded={(newPlan) => {
          if (onPlanUpgraded) onPlanUpgraded(newPlan);
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
};
