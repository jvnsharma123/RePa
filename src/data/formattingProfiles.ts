import {
  ManuscriptFormattingProfile,
  Project,
  SupportedCitationStyle
} from '../types';

/**
 * Initial standard formatting profiles for RePa manuscript engine.
 * Extensible for university/journal-specific guidelines.
 */
export const DEFAULT_FORMATTING_PROFILES: ManuscriptFormattingProfile[] = [
  {
    id: 'general_research_paper',
    name: 'General Research Paper',
    shortName: 'Research Paper',
    description:
      'Standard peer-reviewed research paper layout conforming to international scientific journal norms with 1-inch margins, 12pt serif body, 1.5x line spacing, numbered headings, and compact byline.',
    category: 'General',
    badge: 'Standard Journal & Article',
    iconName: 'FileText',
    pageMargins: {
      top: '1.0 in',
      bottom: '1.0 in',
      left: '1.0 in',
      right: '1.0 in',
      label: '1.0 in (2.54 cm) Standard Margins'
    },
    typography: {
      fontFamily: "'Times New Roman', 'Times', 'Nimbus Roman No9 L', serif",
      fontCategory: 'serif',
      baseFontSizePt: 12,
      lineSpacing: '1.5',
      lineSpacingLabel: '1.5x Line Spacing',
      paragraphSpacingPt: 6,
      paragraphIndent: '0.0 in',
      textAlign: 'left'
    },
    headingHierarchy: {
      h1: {
        fontSizePt: 14,
        fontWeight: 'bold',
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1. Introduction"
        spacingBeforePt: 18,
        spacingAfterPt: 6
      },
      h2: {
        fontSizePt: 12,
        fontWeight: 'bold',
        italic: true,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1.1 Background"
        spacingBeforePt: 14,
        spacingAfterPt: 4
      },
      h3: {
        fontSizePt: 12,
        fontWeight: 'normal',
        italic: true,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1.1.1 Methods"
        spacingBeforePt: 10,
        spacingAfterPt: 3
      }
    },
    titleAuthorArea: {
      style: 'journal_banner',
      titleFontSizePt: 18,
      titleFontWeight: 'bold',
      authorLayout: 'byline_compact',
      includeAbstractPage: false,
      includeTableOfContents: false,
      departmentPlaceholder: 'Department of Research and Innovation',
      institutionPlaceholder: 'Academic Institute of Science'
    },
    captions: {
      figureCaptionStyle: 'below',
      figureLabelPrefix: 'Figure',
      figureNumbering: 'sequential',
      tableCaptionStyle: 'above',
      tableLabelPrefix: 'Table',
      tableNumbering: 'sequential',
      fontSizePt: 10,
      italic: false,
      boldLabel: true,
      align: 'left'
    },
    citationStyle: 'APA',
    referenceListSettings: {
      title: 'References',
      hangingIndent: '0.5 in',
      lineSpacing: '1.0',
      spacingBetweenEntriesPt: 6
    },
    isCustomizable: true,
    notes: 'Recommended for standard journal submissions, conference manuscripts, and empirical research reports.'
  },
  {
    id: 'masters_thesis',
    name: "Master's Thesis",
    shortName: "Master's Thesis",
    description:
      "Postgraduate academic treatise format featuring a 1.5-inch left binding margin, formal university title & declaration page, chapter-indexed headings, 1.5x line spacing, and justified academic typography.",
    category: 'Thesis',
    badge: 'Postgraduate Thesis Standard',
    iconName: 'GraduationCap',
    pageMargins: {
      top: '1.0 in',
      bottom: '1.0 in',
      left: '1.5 in',
      right: '1.0 in',
      gutter: '0.5 in',
      label: '1.5 in Left (Binding Gutter), 1.0 in Top/Bottom/Right'
    },
    typography: {
      fontFamily: "'Times New Roman', 'Times', 'Georgia', serif",
      fontCategory: 'serif',
      baseFontSizePt: 12,
      lineSpacing: '1.5',
      lineSpacingLabel: '1.5x Line Spacing',
      paragraphSpacingPt: 0,
      paragraphIndent: '0.5 in',
      textAlign: 'justify'
    },
    headingHierarchy: {
      h1: {
        fontSizePt: 18,
        fontWeight: 'bold',
        textTransform: 'none',
        align: 'center',
        numberingStyle: 'chapter', // e.g. "Chapter 1: Introduction"
        spacingBeforePt: 24,
        spacingAfterPt: 12
      },
      h2: {
        fontSizePt: 14,
        fontWeight: 'bold',
        italic: false,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1.1 Background of the Study"
        spacingBeforePt: 16,
        spacingAfterPt: 6
      },
      h3: {
        fontSizePt: 12,
        fontWeight: 'bold',
        italic: true,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1.1.1 Problem Statement"
        spacingBeforePt: 12,
        spacingAfterPt: 4
      }
    },
    titleAuthorArea: {
      style: 'thesis_cover_page',
      titleFontSizePt: 20,
      titleFontWeight: 'bold',
      authorLayout: 'thesis_submission_block',
      includeAbstractPage: true,
      includeTableOfContents: true,
      degreeStatement: 'A Thesis Submitted in Partial Fulfillment of the Requirements for the Degree of Master of Science',
      departmentPlaceholder: 'Department of Graduate Studies',
      institutionPlaceholder: 'University Graduate Faculty',
      showCommitteeBlock: true
    },
    captions: {
      figureCaptionStyle: 'below',
      figureLabelPrefix: 'Figure',
      figureNumbering: 'chapter_based', // e.g. "Figure 1.1: ..."
      tableCaptionStyle: 'above',
      tableLabelPrefix: 'Table',
      tableNumbering: 'chapter_based', // e.g. "Table 1.1: ..."
      fontSizePt: 10.5,
      italic: true,
      boldLabel: true,
      align: 'left'
    },
    citationStyle: 'APA',
    referenceListSettings: {
      title: 'Bibliography',
      hangingIndent: '0.5 in',
      lineSpacing: '1.5',
      spacingBetweenEntriesPt: 8
    },
    isCustomizable: true,
    notes: 'Conforms to postgraduate university binding requirements with 1.5-inch left gutter margin.'
  },
  {
    id: 'phd_thesis',
    name: 'PhD Thesis',
    shortName: 'PhD Thesis',
    description:
      'Doctoral dissertation layout featuring formal dissertation defense title page, advisory committee block, 1.5-inch binding gutter, double line spacing, uppercase chapter headers, and comprehensive references.',
    category: 'Dissertation',
    badge: 'Doctoral Dissertation Standard',
    iconName: 'Award',
    pageMargins: {
      top: '1.0 in',
      bottom: '1.0 in',
      left: '1.5 in',
      right: '1.0 in',
      gutter: '0.5 in',
      label: '1.5 in Left (Binding Margin), 1.0 in Top/Bottom/Right'
    },
    typography: {
      fontFamily: "'Times New Roman', 'Times', 'Garamond', serif",
      fontCategory: 'serif',
      baseFontSizePt: 12,
      lineSpacing: '2.0',
      lineSpacingLabel: 'Double Spaced (2.0)',
      paragraphSpacingPt: 0,
      paragraphIndent: '0.5 in',
      textAlign: 'justify'
    },
    headingHierarchy: {
      h1: {
        fontSizePt: 20,
        fontWeight: 'bold',
        textTransform: 'uppercase', // e.g. "CHAPTER 1: INTRODUCTION"
        align: 'center',
        numberingStyle: 'chapter',
        spacingBeforePt: 28,
        spacingAfterPt: 14
      },
      h2: {
        fontSizePt: 15,
        fontWeight: 'bold',
        italic: false,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1.1 Theoretical Framework"
        spacingBeforePt: 18,
        spacingAfterPt: 8
      },
      h3: {
        fontSizePt: 13,
        fontWeight: 'bold',
        italic: true,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'arabic', // e.g. "1.1.1 Epistemological Basis"
        spacingBeforePt: 12,
        spacingAfterPt: 6
      },
      h4: {
        fontSizePt: 12,
        fontWeight: 'normal',
        italic: true,
        textTransform: 'none',
        align: 'left',
        numberingStyle: 'none',
        spacingBeforePt: 8,
        spacingAfterPt: 4
      }
    },
    titleAuthorArea: {
      style: 'thesis_cover_page',
      titleFontSizePt: 22,
      titleFontWeight: 'bold',
      authorLayout: 'thesis_submission_block',
      includeAbstractPage: true,
      includeTableOfContents: true,
      degreeStatement: 'A Dissertation Presented to the Faculty of the Graduate School in Candidacy for the Degree of Doctor of Philosophy',
      departmentPlaceholder: 'Department of Advanced Doctoral Studies',
      institutionPlaceholder: 'The University Senate & Graduate Council',
      showCommitteeBlock: true
    },
    captions: {
      figureCaptionStyle: 'below',
      figureLabelPrefix: 'Figure',
      figureNumbering: 'chapter_based', // e.g. "Figure 1.1"
      tableCaptionStyle: 'above',
      tableLabelPrefix: 'Table',
      tableNumbering: 'chapter_based', // e.g. "Table 1.1"
      fontSizePt: 10,
      italic: true,
      boldLabel: true,
      align: 'center'
    },
    citationStyle: 'Vancouver',
    referenceListSettings: {
      title: 'References & Bibliography',
      hangingIndent: '0.5 in',
      lineSpacing: '1.5',
      spacingBetweenEntriesPt: 10
    },
    isCustomizable: true,
    notes: 'Meets rigorous university doctoral board specifications for final dissertation binding and digital archival.'
  }
];

/**
 * Retrieves a formatting profile by its ID, with fallback to General Research Paper.
 */
export function getFormattingProfileById(id?: string): ManuscriptFormattingProfile {
  if (!id) return DEFAULT_FORMATTING_PROFILES[0];
  const found = DEFAULT_FORMATTING_PROFILES.find((p) => p.id === id);
  return found || DEFAULT_FORMATTING_PROFILES[0];
}

/**
 * Resolves the active formatting profile for a project, considering project custom overrides,
 * document type hints, or default selection.
 */
export function resolveProjectFormattingProfile(project: Project): ManuscriptFormattingProfile {
  // If project has custom override
  if (project.customFormattingProfile) {
    return project.customFormattingProfile;
  }

  // If project has formattingProfileId set
  if (project.formattingProfileId) {
    return getFormattingProfileById(project.formattingProfileId);
  }

  // If manuscript has formattingProfileId set
  if (project.manuscript?.formattingProfileId) {
    return getFormattingProfileById(project.manuscript.formattingProfileId);
  }

  // Infer sensible default based on documentTypeId
  const docType = project.documentTypeId;
  if (docType === 'phd_thesis' || docType === 'phd_dissertation') {
    return getFormattingProfileById('phd_thesis');
  }
  if (docType === 'masters_thesis' || docType === 'masters_dissertation') {
    return getFormattingProfileById('masters_thesis');
  }

  return DEFAULT_FORMATTING_PROFILES[0]; // General Research Paper
}

/**
 * Formats a figure caption label according to the profile rules.
 */
export function formatFigureCaptionLabel(
  figureNumber: number,
  profile: ManuscriptFormattingProfile,
  chapterNumber: number = 1
): string {
  const prefix = profile.captions.figureLabelPrefix || 'Figure';
  if (profile.captions.figureNumbering === 'chapter_based') {
    return `${prefix} ${chapterNumber}.${figureNumber}:`;
  }
  return `${prefix} ${figureNumber}:`;
}

/**
 * Formats a table caption label according to the profile rules.
 */
export function formatTableCaptionLabel(
  tableNumber: number,
  profile: ManuscriptFormattingProfile,
  chapterNumber: number = 1
): string {
  const prefix = profile.captions.tableLabelPrefix || 'Table';
  if (profile.captions.tableNumbering === 'chapter_based') {
    return `${prefix} ${chapterNumber}.${tableNumber}:`;
  }
  return `${prefix} ${tableNumber}:`;
}

/**
 * Formats a section heading according to profile heading hierarchy.
 */
export function formatSectionHeadingTitle(
  rawTitle: string,
  sectionIndex: number,
  profile: ManuscriptFormattingProfile,
  isChapter: boolean = true
): string {
  const h1Rules = profile.headingHierarchy.h1;
  const num = sectionIndex + 1;

  // Clean raw title of existing "Chapter X:" or "1." prefixes if any
  const cleanTitle = rawTitle
    .replace(/^chapter\s+\d+:\s*/i, '')
    .replace(/^\d+(\.\d+)*\s*[\.:\-]\s*/, '')
    .trim();

  let formatted = cleanTitle;

  if (isChapter) {
    if (h1Rules.numberingStyle === 'chapter') {
      formatted = `Chapter ${num}: ${cleanTitle}`;
    } else if (h1Rules.numberingStyle === 'arabic') {
      formatted = `${num}. ${cleanTitle}`;
    } else if (h1Rules.numberingStyle === 'roman') {
      const romanNums = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const roman = romanNums[sectionIndex] || `${num}`;
      formatted = `${roman}. ${cleanTitle}`;
    }

    if (h1Rules.textTransform === 'uppercase') {
      formatted = formatted.toUpperCase();
    }
  }

  return formatted;
}
