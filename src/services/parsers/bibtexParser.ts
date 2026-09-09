import {
  ProjectReference,
  ReferenceAuthor,
  PublicationType,
  ParsedReferenceEntry,
  ReferenceImportBatchResult
} from '../../types';
import { normalizeDoi, detectDuplicateReference } from '../supabaseData';

/**
 * Unescapes common LaTeX special characters and accents
 */
export function unescapeLatex(text?: string): string {
  if (!text) return '';
  let str = text;

  // Accents with braces: {\"a}, {\'e}, etc.
  str = str.replace(/\{\\"([a-zA-Z])\}/g, '$1');
  str = str.replace(/\{\\'([a-zA-Z])\}/g, '$1');
  str = str.replace(/\{\\`([a-zA-Z])\}/g, '$1');
  str = str.replace(/\{\\^([a-zA-Z])\}/g, '$1');
  str = str.replace(/\{\\~([a-zA-Z])\}/g, '$1');
  str = str.replace(/\{\\c\{([a-zA-Z])\}\}/g, '$1');
  str = str.replace(/\{\\u\{([a-zA-Z])\}\}/g, '$1');
  str = str.replace(/\{\\v\{([a-zA-Z])\}\}/g, '$1');
  str = str.replace(/\{\\H\{([a-zA-Z])\}\}/g, '$1');

  // Accents without inner braces: \"{a}, \'e, etc.
  str = str.replace(/\\"\{?([a-zA-Z])\}?/g, '$1');
  str = str.replace(/\\'\{?([a-zA-Z])\}?/g, '$1');
  str = str.replace(/\\`\{?([a-zA-Z])\}?/g, '$1');
  str = str.replace(/\\\^\{?([a-zA-Z])\}?/g, '$1');
  str = str.replace(/\\~\{?([a-zA-Z])\}?/g, '$1');

  // Special LaTeX symbols & entities
  str = str.replace(/\\ss\b/g, 'ß');
  str = str.replace(/\\aa\b/g, 'å');
  str = str.replace(/\\AA\b/g, 'Å');
  str = str.replace(/\\o\b/g, 'ø');
  str = str.replace(/\\O\b/g, 'Ø');
  str = str.replace(/\\ae\b/g, 'æ');
  str = str.replace(/\\AE\b/g, 'Æ');
  str = str.replace(/---/g, '—');
  str = str.replace(/--/g, '–');
  str = str.replace(/\\&/g, '&');
  str = str.replace(/\\%/g, '%');
  str = str.replace(/\\\$/g, '$');
  str = str.replace(/\\_/g, '_');
  str = str.replace(/\\#/g, '#');

  // Strip remaining unmatched curly braces used for LaTeX capitalization protection
  str = str.replace(/[{}]/g, '');

  return str.trim();
}

/**
 * Parses author strings into structured ReferenceAuthor array
 */
export function parseBibtexAuthors(authorStr?: string): ReferenceAuthor[] {
  if (!authorStr || !authorStr.trim()) return [];

  const rawAuthors = authorStr.split(/\s+and\s+/i);
  const authors: ReferenceAuthor[] = [];

  for (const raw of rawAuthors) {
    const cleaned = unescapeLatex(raw).trim();
    if (!cleaned) continue;

    if (cleaned.includes(',')) {
      // Format: "Lastname, Firstname Mid" or "Lastname, F. M."
      const parts = cleaned.split(',').map((p) => p.trim());
      const lastName = parts[0] || 'Unknown';
      const firstName = parts.slice(1).join(' ').trim();
      const fullName = firstName ? `${firstName} ${lastName}` : lastName;
      authors.push({ firstName, lastName, fullName });
    } else {
      // Format: "Firstname Lastname"
      const parts = cleaned.split(/\s+/);
      if (parts.length === 1) {
        authors.push({ lastName: parts[0], fullName: parts[0] });
      } else {
        const lastName = parts[parts.length - 1];
        const firstName = parts.slice(0, parts.length - 1).join(' ');
        authors.push({ firstName, lastName, fullName: cleaned });
      }
    }
  }

  return authors;
}

/**
 * Maps BibTeX entry types to PublicationType
 */
function mapBibtexType(entryType: string): PublicationType {
  const t = entryType.toLowerCase();
  switch (t) {
    case 'article':
      return 'article';
    case 'book':
    case 'booklet':
      return 'book';
    case 'incollection':
    case 'inbook':
      return 'chapter';
    case 'inproceedings':
    case 'conference':
    case 'proceedings':
      return 'conference';
    case 'phdthesis':
    case 'mastersthesis':
      return 'thesis';
    case 'techreport':
    case 'manual':
      return 'report';
    case 'preprint':
    case 'unpublished':
      return 'preprint';
    case 'patent':
      return 'patent';
    case 'dataset':
      return 'dataset';
    default:
      return 'other';
  }
}

/**
 * Tokenizes and parses BibTeX text into key-value entries
 */
export function parseBibtex(
  bibtexContent: string,
  projectId: string,
  existingReferences: ProjectReference[] = []
): ReferenceImportBatchResult {
  const entries: ParsedReferenceEntry[] = [];
  const rawContent = bibtexContent.trim();

  if (!rawContent) {
    return {
      entries: [],
      summary: { totalParsed: 0, newCount: 0, duplicateCount: 0, incompleteCount: 0, errorCount: 0 },
      sourceFormat: 'bibtex',
    };
  }

  // Regex to match BibTeX entries: @type{citationKey, fields...}
  // Matches '@' followed by type, '{' or '(', then the citation key, and the rest of the body
  const entryRegex = /@([a-zA-Z]+)\s*[\{\(]\s*([^,\s]+)\s*,([\s\S]*?)(?=(?:@(?:article|book|inproceedings|conference|incollection|inbook|phdthesis|mastersthesis|techreport|manual|unpublished|misc|online|preprint)\s*[\{\(]|$))/gi;

  let match: RegExpExecArray | null;
  let parsedCount = 0;

  while ((match = entryRegex.exec(rawContent)) !== null) {
    parsedCount++;
    const entryType = match[1].toLowerCase();
    const citeKey = match[2].trim();
    const fieldsBody = match[3].trim();
    const rawSnippet = match[0].trim();

    // Skip comments or preamble
    if (entryType === 'comment' || entryType === 'preamble' || entryType === 'string') {
      continue;
    }

    const fields: Record<string, string> = {};
    const issues: string[] = [];

    // Parse field key-value pairs
    // Handle both `field = {value}` and `field = "value"` and `field = 123`
    const fieldRegex = /([a-zA-Z_-]+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"\\]*(?:\\.[^"\\]*)*)"|([0-9a-zA-Z_-]+))/g;

    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(fieldsBody)) !== null) {
      const key = fieldMatch[1].toLowerCase().trim();
      const val = (fieldMatch[2] ?? fieldMatch[3] ?? fieldMatch[4] ?? '').trim();
      fields[key] = val;
    }

    // Extract & normalize fields
    const title = unescapeLatex(fields['title'] || fields['booktitle'] || '');
    const authors = parseBibtexAuthors(fields['author'] || fields['editor']);
    const journal = unescapeLatex(fields['journal'] || fields['journaltitle'] || fields['booktitle'] || '');
    const yearRaw = fields['year'] || fields['date'] || '';
    const yearMatch = yearRaw.match(/\b(19\d\d|20\d\d)\b/);
    const publicationYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
    const volume = fields['volume'] || undefined;
    const issue = fields['number'] || fields['issue'] || undefined;
    const pages = unescapeLatex(fields['pages'] || '');
    const doi = normalizeDoi(fields['doi'] || '');
    const pmid = fields['pmid'] || fields['pubmed'] || undefined;
    const url = fields['url'] || fields['eprint'] || undefined;
    const publisher = unescapeLatex(fields['publisher'] || fields['organization'] || fields['institution'] || '');
    const abstract = unescapeLatex(fields['abstract'] || fields['summary'] || '');
    const issn = fields['issn'] || undefined;
    const isbn = fields['isbn'] || undefined;
    const publicationType = mapBibtexType(entryType);

    // Validate completeness
    if (!title) {
      issues.push('Missing publication title');
    }
    if (authors.length === 0) {
      issues.push('Missing author information');
    }
    if (!publicationYear) {
      issues.push('Missing publication year');
    }

    const tempId = `temp-bib-${Date.now()}-${parsedCount}`;
    const parsedRef: Partial<ProjectReference> = {
      id: tempId,
      projectId,
      title: title || `Untitled [${citeKey}]`,
      authors,
      journal,
      publicationYear,
      volume,
      issue,
      pages,
      doi: doi || undefined,
      pmid,
      url,
      publisher,
      abstract,
      issn,
      isbn,
      publicationType,
      citationKey: citeKey,
      sourceDatabase: 'bibtex',
      metadataSource: 'bibtex',
      metadataProvider: 'BibTeX File Import',
      verificationStatus: issues.length === 0 ? 'VERIFIED' : 'METADATA_INCOMPLETE',
      rawSourceData: rawSnippet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Duplicate Detection against existing project references
    const dupCheck = detectDuplicateReference(parsedRef, existingReferences);

    let statusCategory: 'NEW' | 'DUPLICATE' | 'INCOMPLETE' | 'ERROR' = 'NEW';
    let isValid = true;

    if (!title && authors.length === 0) {
      statusCategory = 'ERROR';
      isValid = false;
      issues.push('Unusable BibTeX entry: lacking both title and authors');
    } else if (dupCheck.isDuplicate) {
      statusCategory = 'DUPLICATE';
    } else if (issues.length > 0) {
      statusCategory = 'INCOMPLETE';
    }

    entries.push({
      tempId,
      reference: parsedRef,
      rawText: rawSnippet,
      issues,
      isValid,
      isDuplicate: dupCheck.isDuplicate,
      duplicateOf: dupCheck.duplicateOf,
      duplicateReason: dupCheck.matchReason,
      statusCategory,
      selectedForImport: statusCategory === 'NEW' || statusCategory === 'INCOMPLETE',
    });
  }

  // If no structured entries found, record parsing failure
  if (entries.length === 0 && rawContent.length > 0) {
    entries.push({
      tempId: `error-${Date.now()}`,
      reference: {
        id: `error-${Date.now()}`,
        projectId,
        title: 'Unparseable BibTeX input',
        authors: [],
        verificationStatus: 'REJECTED',
      },
      rawText: rawContent.slice(0, 300),
      issues: ['No valid @entry{...} structures could be recognized in the provided text.'],
      isValid: false,
      statusCategory: 'ERROR',
      selectedForImport: false,
    });
  }

  const summary = {
    totalParsed: entries.length,
    newCount: entries.filter((e) => e.statusCategory === 'NEW').length,
    duplicateCount: entries.filter((e) => e.statusCategory === 'DUPLICATE').length,
    incompleteCount: entries.filter((e) => e.statusCategory === 'INCOMPLETE').length,
    errorCount: entries.filter((e) => e.statusCategory === 'ERROR').length,
  };

  return {
    entries,
    summary,
    sourceFormat: 'bibtex',
  };
}
