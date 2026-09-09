import {
  ProjectReference,
  ReferenceAuthor,
  PublicationType,
  ParsedReferenceEntry,
  ReferenceImportBatchResult
} from '../../types';
import { normalizeDoi, detectDuplicateReference } from '../supabaseData';

/**
 * Maps RIS type (TY) to PublicationType
 */
function mapRisType(ty?: string): PublicationType {
  if (!ty) return 'article';
  const t = ty.toUpperCase().trim();
  switch (t) {
    case 'JOUR':
    case 'MGZN':
    case 'NEWS':
      return 'article';
    case 'BOOK':
      return 'book';
    case 'CHAP':
      return 'chapter';
    case 'CONF':
    case 'CPAPER':
      return 'conference';
    case 'THES':
      return 'thesis';
    case 'RPRT':
    case 'STAND':
      return 'report';
    case 'PREP':
    case 'UNPB':
      return 'preprint';
    case 'PAT':
      return 'patent';
    case 'DATA':
      return 'dataset';
    default:
      return 'other';
  }
}

/**
 * Parse an author from a single RIS line (AU, A1, A2)
 */
function parseRisAuthor(authorStr: string): ReferenceAuthor {
  const cleaned = authorStr.trim();
  if (!cleaned) return { lastName: 'Unknown', fullName: 'Unknown' };

  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((p) => p.trim());
    const lastName = parts[0] || 'Unknown';
    const firstName = parts.slice(1).join(' ').trim();
    const fullName = firstName ? `${firstName} ${lastName}` : lastName;
    return { firstName, lastName, fullName };
  } else {
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) {
      return { lastName: parts[0], fullName: parts[0] };
    }
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, parts.length - 1).join(' ');
    return { firstName, lastName, fullName: cleaned };
  }
}

/**
 * Tokenizes and parses RIS text records into ProjectReference objects
 */
export function parseRis(
  risContent: string,
  projectId: string,
  existingReferences: ProjectReference[] = []
): ReferenceImportBatchResult {
  const entries: ParsedReferenceEntry[] = [];
  const rawContent = risContent.trim();

  if (!rawContent) {
    return {
      entries: [],
      summary: { totalParsed: 0, newCount: 0, duplicateCount: 0, incompleteCount: 0, errorCount: 0 },
      sourceFormat: 'ris',
    };
  }

  // Split content into individual records by ER (End of Record) tag or double newlines
  const lines = rawContent.split(/\r?\n/);
  const rawRecords: string[][] = [];
  let currentRecordLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    currentRecordLines.push(line);

    // End of Record marker
    if (trimmed.startsWith('ER  -') || trimmed.startsWith('ER -') || trimmed === 'ER') {
      rawRecords.push([...currentRecordLines]);
      currentRecordLines = [];
    }
  }

  // If there are trailing lines without an ER marker, treat them as the last record
  if (currentRecordLines.length > 0) {
    rawRecords.push(currentRecordLines);
  }

  let recordIdx = 0;

  for (const recordLines of rawRecords) {
    recordIdx++;
    const rawSnippet = recordLines.join('\n');
    const tags: Record<string, string[]> = {};
    let currentTag = '';

    for (const line of recordLines) {
      // RIS tag pattern: 2 characters followed by spaces/hyphen, e.g. "TI  - Title" or "AU  - Author"
      const match = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
      if (match) {
        currentTag = match[1].toUpperCase();
        const value = match[2].trim();
        if (!tags[currentTag]) {
          tags[currentTag] = [];
        }
        if (value) {
          tags[currentTag].push(value);
        }
      } else if (currentTag && line.startsWith('   ')) {
        // Multi-line continuation (common in abstracts)
        const continuation = line.trim();
        if (tags[currentTag].length > 0) {
          tags[currentTag][tags[currentTag].length - 1] += ' ' + continuation;
        }
      }
    }

    // Skip empty records
    if (Object.keys(tags).length === 0) continue;

    const issues: string[] = [];

    // Map RIS tags to fields
    const ty = tags['TY']?.[0] || 'JOUR';
    const title = tags['TI']?.[0] || tags['T1']?.[0] || tags['CT']?.[0] || tags['BT']?.[0] || '';
    
    // Authors (AU, A1)
    const authorStrings = [
      ...(tags['AU'] || []),
      ...(tags['A1'] || []),
    ];
    const authors: ReferenceAuthor[] = authorStrings.map(parseRisAuthor);

    const journal = tags['JO']?.[0] || tags['JF']?.[0] || tags['JA']?.[0] || tags['J2']?.[0] || tags['T2']?.[0] || '';
    
    // Year parsing from PY or Y1
    const yearRaw = tags['PY']?.[0] || tags['Y1']?.[0] || tags['DA']?.[0] || '';
    const yearMatch = yearRaw.match(/\b(19\d\d|20\d\d)\b/);
    const publicationYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

    const volume = tags['VL']?.[0] || undefined;
    const issue = tags['IS']?.[0] || undefined;
    
    // Page range from SP and EP
    const startPage = tags['SP']?.[0] || '';
    const endPage = tags['EP']?.[0] || '';
    let pages: string | undefined = undefined;
    if (startPage && endPage) {
      pages = `${startPage}–${endPage}`;
    } else if (startPage) {
      pages = startPage;
    }

    const doi = normalizeDoi(tags['DO']?.[0] || tags['DI']?.[0] || '');
    const pmid = tags['PMID']?.[0] || tags['AN']?.[0]?.replace(/^PMID:\s*/i, '') || undefined;
    const url = tags['UR']?.[0] || tags['L1']?.[0] || tags['L2']?.[0] || undefined;
    const publisher = tags['PB']?.[0] || undefined;
    const abstract = tags['AB']?.[0] || tags['N2']?.[0] || undefined;
    const issn = tags['SN']?.[0] || undefined;
    const publicationType = mapRisType(ty);

    // Auto-generate citation key: e.g. "Author2023" or ID tag
    const idTag = tags['ID']?.[0];
    const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Ref';
    const citationKey = idTag || (publicationYear ? `${firstAuthor}${publicationYear}` : `${firstAuthor}${recordIdx}`);

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

    const tempId = `temp-ris-${Date.now()}-${recordIdx}`;
    const parsedRef: Partial<ProjectReference> = {
      id: tempId,
      projectId,
      title: title || `Untitled Reference (${recordIdx})`,
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
      publicationType,
      citationKey,
      sourceDatabase: 'ris',
      metadataSource: 'ris',
      metadataProvider: 'RIS File Import',
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
      issues.push('Unusable RIS record: missing both title and authors');
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

  // If no structured entries found
  if (entries.length === 0 && rawContent.length > 0) {
    entries.push({
      tempId: `error-${Date.now()}`,
      reference: {
        id: `error-${Date.now()}`,
        projectId,
        title: 'Unparseable RIS input',
        authors: [],
        verificationStatus: 'REJECTED',
      },
      rawText: rawContent.slice(0, 300),
      issues: ['No valid RIS TY/TI/AU/ER tags could be found in the provided file.'],
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
    sourceFormat: 'ris',
  };
}
