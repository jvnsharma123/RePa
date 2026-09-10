import {
  Project,
  ProjectReference,
  ManuscriptCitation,
  ReferenceAuthor,
  SupportedCitationStyle
} from '../types';

export interface FormattedReferenceItem {
  id: string;
  reference: ProjectReference;
  orderNumber?: number; // 1-based index for Vancouver / IEEE
  formattedText: string;
  inTextPreview: string;
  citationKey: string;
  isCitedInManuscript: boolean;
  citationCount: number;
}

export interface CitedReferenceAnalysis {
  citedReferences: ProjectReference[];
  refToOrderMap: Map<string, number>; // referenceId -> 1-based numeric order for appearance
  citationKeyToRefMap: Map<string, ProjectReference>;
  refIdToCitationCount: Map<string, number>;
  uncitedReferences: ProjectReference[];
}

/**
 * Format author initials and names helper
 */
function getAuthorInitials(firstName?: string, fullName?: string): string {
  if (firstName && firstName.trim()) {
    return firstName
      .trim()
      .split(/[\s.-]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return parts
        .slice(0, -1)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('');
    }
  }
  return '';
}

function getAuthorInitialsWithDots(firstName?: string, fullName?: string): string {
  const initials = getAuthorInitials(firstName, fullName);
  if (!initials) return '';
  return initials
    .split('')
    .map((c) => `${c}.`)
    .join(' ');
}

function extractAuthorLastName(author: ReferenceAuthor): string {
  if (author.lastName && author.lastName.trim()) {
    return author.lastName.trim();
  }
  if (author.fullName && author.fullName.trim()) {
    const parts = author.fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || 'Author';
  }
  return 'Author';
}

/**
 * Format authors according to Vancouver style:
 * "Smith JA, Jones RB, Williams CD, et al." (up to 6 authors, then et al.)
 */
export function formatAuthorsVancouver(authors?: ReferenceAuthor[]): string {
  if (!authors || authors.length === 0) return 'Anonymous';

  const formatted = authors.map((a) => {
    const last = extractAuthorLastName(a);
    const initials = getAuthorInitials(a.firstName, a.fullName);
    return initials ? `${last} ${initials}` : last;
  });

  if (formatted.length <= 6) {
    return formatted.join(', ');
  }
  return `${formatted.slice(0, 6).join(', ')}, et al.`;
}

/**
 * Format authors according to APA 7th Edition style:
 * 1 author: "Smith, J. A."
 * 2 authors: "Smith, J. A., & Jones, R. B."
 * 3-20 authors: "Smith, J. A., Jones, R. B., & Williams, C. D."
 * >20 authors: First 19 ..., Last
 */
export function formatAuthorsAPA(authors?: ReferenceAuthor[]): string {
  if (!authors || authors.length === 0) return 'Anonymous';

  const formatted = authors.map((a) => {
    const last = extractAuthorLastName(a);
    const dots = getAuthorInitialsWithDots(a.firstName, a.fullName);
    return dots ? `${last}, ${dots}` : last;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  if (formatted.length <= 20) {
    const allButLast = formatted.slice(0, -1).join(', ');
    return `${allButLast}, & ${formatted[formatted.length - 1]}`;
  }
  return `${formatted.slice(0, 19).join(', ')}, … ${formatted[formatted.length - 1]}`;
}

/**
 * Format authors according to IEEE style:
 * 1 author: "J. A. Smith"
 * 2 authors: "J. A. Smith and R. B. Jones"
 * 3-6 authors: "J. A. Smith, R. B. Jones, and C. D. Williams"
 * >6 authors: "J. A. Smith et al."
 */
export function formatAuthorsIEEE(authors?: ReferenceAuthor[]): string {
  if (!authors || authors.length === 0) return 'Anonymous';

  const formatted = authors.map((a) => {
    const last = extractAuthorLastName(a);
    const dots = getAuthorInitialsWithDots(a.firstName, a.fullName);
    return dots ? `${dots} ${last}` : last;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length <= 6) {
    const allButLast = formatted.slice(0, -1).join(', ');
    return `${allButLast}, and ${formatted[formatted.length - 1]}`;
  }
  return `${formatted[0]} et al.`;
}

/**
 * In-Text Citation Formatter for a single reference or group of references
 */
export function formatInTextCitation(
  references: ProjectReference[],
  style: SupportedCitationStyle,
  refToOrderMap?: Map<string, number>
): string {
  if (!references || references.length === 0) return '';

  if (style === 'Vancouver') {
    const numbers = references
      .map((r) => refToOrderMap?.get(r.id) || 1)
      .filter((n, idx, arr) => arr.indexOf(n) === idx)
      .sort((a, b) => a - b);

    if (numbers.length === 0) return '(1)';
    if (numbers.length === 1) return `(${numbers[0]})`;

    // Check if consecutive range (e.g. 1, 2, 3 -> (1-3))
    const isConsecutive =
      numbers.length >= 3 &&
      numbers.every((val, i) => i === 0 || val === numbers[i - 1] + 1);

    if (isConsecutive) {
      return `(${numbers[0]}-${numbers[numbers.length - 1]})`;
    }
    return `(${numbers.join(', ')})`;
  }

  if (style === 'IEEE') {
    const numbers = references
      .map((r) => refToOrderMap?.get(r.id) || 1)
      .filter((n, idx, arr) => arr.indexOf(n) === idx)
      .sort((a, b) => a - b);

    if (numbers.length === 0) return '[1]';
    if (numbers.length === 1) return `[${numbers[0]}]`;

    const isConsecutive =
      numbers.length >= 3 &&
      numbers.every((val, i) => i === 0 || val === numbers[i - 1] + 1);

    if (isConsecutive) {
      return `[${numbers[0]}]–[${numbers[numbers.length - 1]}]`;
    }
    return numbers.map((n) => `[${n}]`).join(', ');
  }

  // APA Style: Author-Date
  // Single author: (Smith, 2023)
  // Two authors: (Smith & Jones, 2023)
  // 3+ authors: (Smith et al., 2023)
  // Multiple references: (Brown, 2021; Smith & Jones, 2023)
  const formattedRefs = references.map((ref) => {
    const authors = ref.authors || [];
    const year = ref.publicationYear ? `${ref.publicationYear}` : 'n.d.';
    if (authors.length === 0) {
      const shortTitle = ref.title ? `"${ref.title.slice(0, 25)}..."` : 'Anonymous';
      return `${shortTitle}, ${year}`;
    }
    if (authors.length === 1) {
      return `${extractAuthorLastName(authors[0])}, ${year}`;
    }
    if (authors.length === 2) {
      return `${extractAuthorLastName(authors[0])} & ${extractAuthorLastName(authors[1])}, ${year}`;
    }
    return `${extractAuthorLastName(authors[0])} et al., ${year}`;
  });

  return `(${formattedRefs.join('; ')})`;
}

/**
 * Format a single Reference item for the bibliography/References list
 */
export function formatReferenceEntry(
  ref: ProjectReference,
  style: SupportedCitationStyle,
  orderNumber?: number
): {
  formattedText: string;
  orderNumber?: number;
  doi?: string;
  url?: string;
  authors: string;
  title: string;
  year: string;
} {
  const year = ref.publicationYear ? `${ref.publicationYear}` : '';
  const title = ref.title?.trim() || 'Untitled Document';
  const cleanTitle = title.endsWith('.') ? title : `${title}.`;
  const journal = ref.journal?.trim() || '';
  const volume = ref.volume?.trim() || '';
  const issue = ref.issue?.trim() || '';
  const pages = ref.pages?.trim() || '';
  const doi = ref.doi?.trim() || '';
  const publisher = ref.publisher?.trim() || '';

  if (style === 'Vancouver') {
    const authorsText = formatAuthorsVancouver(ref.authors);
    let details = '';

    if (journal) {
      details = journal;
      if (year) details += `. ${year}`;
      if (volume) {
        details += `;${volume}`;
        if (issue) details += `(${issue})`;
        if (pages) details += `:${pages}`;
      } else if (pages) {
        details += `:${pages}`;
      }
      if (!details.endsWith('.')) details += '.';
    } else if (publisher) {
      details = publisher;
      if (year) details += `; ${year}.`;
      else details += '.';
    } else if (year) {
      details = `${year}.`;
    }

    let doiText = '';
    if (doi) {
      const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
      doiText = ` doi:${cleanDoi}`;
    }

    const numPrefix = orderNumber !== undefined ? `${orderNumber}. ` : '';
    const formattedText = `${numPrefix}${authorsText}. ${cleanTitle}${details ? ` ${details}` : ''}${doiText}`.trim();

    return {
      formattedText,
      orderNumber,
      doi,
      url: ref.url,
      authors: authorsText,
      title,
      year
    };
  }

  if (style === 'APA') {
    const authorsText = formatAuthorsAPA(ref.authors);
    const yearText = year ? `(${year}).` : '(n.d.).';
    let journalPart = '';

    if (journal) {
      journalPart = journal;
      if (volume) {
        journalPart += `, ${volume}`;
        if (issue) journalPart += `(${issue})`;
      }
      if (pages) {
        journalPart += `, ${pages.replace('-', '–')}`;
      }
      if (!journalPart.endsWith('.')) journalPart += '.';
    } else if (publisher) {
      journalPart = `${publisher}.`;
    }

    let doiUrl = '';
    if (doi) {
      const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
      doiUrl = ` https://doi.org/${cleanDoi}`;
    } else if (ref.url) {
      doiUrl = ` ${ref.url}`;
    }

    const formattedText = `${authorsText} ${yearText} ${cleanTitle}${journalPart ? ` ${journalPart}` : ''}${doiUrl}`.trim();

    return {
      formattedText,
      doi,
      url: ref.url,
      authors: authorsText,
      title,
      year
    };
  }

  // IEEE Style
  // [1] J. A. Smith and R. B. Jones, "Deep learning in medicine," Nature Medicine, vol. 29, no. 4, pp. 1021-1030, 2023, doi: 10.1038/....
  const authorsText = formatAuthorsIEEE(ref.authors);
  const quotedTitle = `"${title.replace(/[."]+$/, '')},"`;
  let journalPart = '';

  if (journal) {
    journalPart = journal;
    if (volume) journalPart += `, vol. ${volume}`;
    if (issue) journalPart += `, no. ${issue}`;
    if (pages) journalPart += `, pp. ${pages}`;
    if (year) journalPart += `, ${year}`;
  } else if (publisher) {
    journalPart = publisher;
    if (year) journalPart += `, ${year}`;
  } else if (year) {
    journalPart = year;
  }

  let doiText = '';
  if (doi) {
    const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    doiText = `, doi: ${cleanDoi}`;
  }

  const numPrefix = orderNumber !== undefined ? `[${orderNumber}] ` : '';
  const formattedText = `${numPrefix}${authorsText}, ${quotedTitle} ${journalPart}${doiText}.`.trim();

  return {
    formattedText,
    orderNumber,
    doi,
    url: ref.url,
    authors: authorsText,
    title,
    year
  };
}

/**
 * Deep extraction and sequential analysis of all references cited in manuscript sections
 */
export function extractCitedReferences(project: Project): CitedReferenceAnalysis {
  const allReferences: ProjectReference[] = [
    ...(project.references || []),
    ...(project.projectReferences || [])
  ].filter((r, idx, arr) => arr.findIndex((x) => x.id === r.id) === idx);

  const refIdMap = new Map<string, ProjectReference>();
  const citationKeyToRefMap = new Map<string, ProjectReference>();
  const doiToRefMap = new Map<string, ProjectReference>();

  allReferences.forEach((ref) => {
    refIdMap.set(ref.id, ref);
    if (ref.citationKey) {
      citationKeyToRefMap.set(ref.citationKey.toLowerCase().trim(), ref);
      // Also match without brackets
      citationKeyToRefMap.set(ref.citationKey.toLowerCase().replace(/[[\]()]/g, '').trim(), ref);
    }
    if (ref.doi) {
      const cleanDoi = ref.doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
      doiToRefMap.set(cleanDoi, ref);
    }
    // Also build a author-year key fallback: e.g. "smith2023"
    const firstAuthor = ref.authors?.[0]?.lastName || ref.authors?.[0]?.fullName?.split(' ')[0] || '';
    if (firstAuthor && ref.publicationYear) {
      const autoKey = `${firstAuthor.toLowerCase().replace(/[^a-z0-9]/g, '')}${ref.publicationYear}`;
      if (!citationKeyToRefMap.has(autoKey)) {
        citationKeyToRefMap.set(autoKey, ref);
      }
    }
  });

  const citedRefIdsInOrder: string[] = [];
  const refIdToCitationCount = new Map<string, number>();

  const recordRefCite = (refId: string) => {
    if (!refIdMap.has(refId)) return;
    if (!citedRefIdsInOrder.includes(refId)) {
      citedRefIdsInOrder.push(refId);
    }
    refIdToCitationCount.set(refId, (refIdToCitationCount.get(refId) || 0) + 1);
  };

  const sections = project.manuscript?.sections || [];
  const existingCitations = project.citations || [];

  // Pass 1: Scan sections in document order
  sections.forEach((section) => {
    const secContent = section.content || '';

    // Check direct section citations from project.citations
    const sectionCitations = existingCitations.filter((c) => c.sectionId === section.id);
    sectionCitations.forEach((c) => {
      if (c.referenceId) recordRefCite(c.referenceId);
    });

    // Check section provenance list
    (section.provenanceList || []).forEach((prov) => {
      (prov.referenceIds || []).forEach((refId) => recordRefCite(refId));
    });

    // Regex scan for in-text citation tags in content, e.g. [Smith2023], [Smith2023; Johnson2024], [ref_123], (Smith, 2023)
    const bracketMatches = secContent.match(/\[([^\]]+)\]/g) || [];
    bracketMatches.forEach((match) => {
      const inner = match.slice(1, -1).trim();
      const parts = inner.split(/[;,]/).map((p) => p.trim());
      parts.forEach((part) => {
        const lowerPart = part.toLowerCase();
        if (citationKeyToRefMap.has(lowerPart)) {
          recordRefCite(citationKeyToRefMap.get(lowerPart)!.id);
        } else if (refIdMap.has(part)) {
          recordRefCite(part);
        }
      });
    });

    // Regex scan for author-date citations: (Author, Year) or (Author & Author, Year) or (Author et al., Year)
    const parenMatches = secContent.match(/\(([A-Za-z\s&.,]+),\s*(\d{4})\)/g) || [];
    parenMatches.forEach((match) => {
      const matchResult = match.match(/\(([A-Za-z\s&.,]+),\s*(\d{4})\)/);
      if (matchResult) {
        const authorPart = matchResult[1].trim().split(/\s+|&|,/)[0].toLowerCase();
        const yearPart = matchResult[2];
        const combinedKey = `${authorPart}${yearPart}`;
        if (citationKeyToRefMap.has(combinedKey)) {
          recordRefCite(citationKeyToRefMap.get(combinedKey)!.id);
        }
      }
    });
  });

  // Pass 2: Any remaining citations in project.citations not yet caught
  existingCitations.forEach((c) => {
    if (c.referenceId) recordRefCite(c.referenceId);
  });

  const citedReferences = citedRefIdsInOrder
    .map((id) => refIdMap.get(id))
    .filter(Boolean) as ProjectReference[];

  const refToOrderMap = new Map<string, number>();
  citedReferences.forEach((ref, index) => {
    refToOrderMap.set(ref.id, index + 1);
  });

  const uncitedReferences = allReferences.filter((r) => !citedRefIdsInOrder.includes(r.id));

  return {
    citedReferences,
    refToOrderMap,
    citationKeyToRefMap,
    refIdToCitationCount,
    uncitedReferences
  };
}

/**
 * Generate full formatted References list for the manuscript
 */
export function generateReferencesList(
  project: Project,
  style: SupportedCitationStyle,
  includeUncited = false
): FormattedReferenceItem[] {
  const { citedReferences, refToOrderMap, uncitedReferences, refIdToCitationCount } =
    extractCitedReferences(project);

  let targetRefs = [...citedReferences];

  if (includeUncited) {
    targetRefs = [...targetRefs, ...uncitedReferences];
  }

  // Sort based on style requirements
  if (style === 'APA') {
    // APA is sorted alphabetically by first author's surname, then year, then title
    targetRefs.sort((a, b) => {
      const aAuthor = extractAuthorLastName(a.authors?.[0] || { lastName: a.title, fullName: a.title });
      const bAuthor = extractAuthorLastName(b.authors?.[0] || { lastName: b.title, fullName: b.title });
      const cmpAuthor = aAuthor.localeCompare(bAuthor, undefined, { sensitivity: 'base' });
      if (cmpAuthor !== 0) return cmpAuthor;

      const aYear = a.publicationYear || 0;
      const bYear = b.publicationYear || 0;
      if (aYear !== bYear) return aYear - bYear;

      return (a.title || '').localeCompare(b.title || '');
    });
  }

  return targetRefs.map((ref, idx) => {
    const isCited = refToOrderMap.has(ref.id);
    const orderNum = isCited ? refToOrderMap.get(ref.id) : (style === 'Vancouver' || style === 'IEEE' ? idx + 1 : undefined);
    const formatted = formatReferenceEntry(ref, style, orderNum);
    const inText = formatInTextCitation([ref], style, refToOrderMap);

    return {
      id: ref.id,
      reference: ref,
      orderNumber: orderNum,
      formattedText: formatted.formattedText,
      inTextPreview: inText,
      citationKey: ref.citationKey || `ref_${ref.id}`,
      isCitedInManuscript: isCited,
      citationCount: refIdToCitationCount.get(ref.id) || 0
    };
  });
}

/**
 * Renders manuscript text by dynamically transforming citation tags into the selected style
 */
export function renderManuscriptWithFormattedCitations(
  content: string,
  project: Project,
  style: SupportedCitationStyle
): string {
  if (!content) return '';

  const { refToOrderMap, citationKeyToRefMap } = extractCitedReferences(project);
  const allReferences: ProjectReference[] = [
    ...(project.references || []),
    ...(project.projectReferences || [])
  ];

  const refIdMap = new Map<string, ProjectReference>();
  allReferences.forEach((r) => refIdMap.set(r.id, r));

  // Replace bracketed citation tags [Key1; Key2] with formatted style
  return content.replace(/\[([^\]]+)\]/g, (match, inner) => {
    // If it's already a clean number in Vancouver/IEEE e.g. [1] or [1-3]
    if (/^\d+(\s*[-–,]\s*\d+)*$/.test(inner.trim()) && style === 'IEEE') {
      return match;
    }

    const parts = inner.split(/[;,]/).map((p: string) => p.trim());
    const matchedRefs: ProjectReference[] = [];

    parts.forEach((part: string) => {
      const lower = part.toLowerCase();
      if (citationKeyToRefMap.has(lower)) {
        matchedRefs.push(citationKeyToRefMap.get(lower)!);
      } else if (refIdMap.has(part)) {
        matchedRefs.push(refIdMap.get(part)!);
      }
    });

    if (matchedRefs.length > 0) {
      return formatInTextCitation(matchedRefs, style, refToOrderMap);
    }

    return match;
  });
}

/**
 * Generate formatted plain text bibliography for exporting or copying
 */
export function generateFormattedBibliographyText(
  project: Project,
  style: SupportedCitationStyle
): string {
  const items = generateReferencesList(project, style, false);
  if (items.length === 0) return 'No references currently cited in this manuscript.';
  return items.map((item) => item.formattedText).join('\n\n');
}
