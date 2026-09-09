import {
  ProjectReference,
  ReferenceAuthor,
  PublicationType,
  ReferenceMetadataProviderResult
} from '../../types';
import { normalizeDoi } from '../supabaseData';

export interface ReferenceMetadataProvider {
  id: string;
  name: string;
  description: string;
  fetchByDoi(doi: string): Promise<ReferenceMetadataProviderResult>;
  fetchByPmid?(pmid: string): Promise<ReferenceMetadataProviderResult>;
}

/**
 * Crossref Metadata Provider
 * Queries Crossref REST API for authoritative DOI bibliographic metadata
 */
export class CrossrefProvider implements ReferenceMetadataProvider {
  id = 'crossref';
  name = 'Crossref';
  description = 'Authoritative metadata for over 150 million academic journal articles, books, and proceedings.';

  async fetchByDoi(rawDoi: string): Promise<ReferenceMetadataProviderResult> {
    const cleanDoi = normalizeDoi(rawDoi);
    if (!cleanDoi) {
      return {
        success: false,
        providerName: this.name,
        errorMessage: 'Please enter a valid DOI.',
      };
    }

    try {
      // First attempt server-side proxy route to respect polite pool and avoid browser CORS
      const res = await fetch('/api/references/enrich-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: cleanDoi }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reference) {
          return {
            success: true,
            providerName: this.name,
            sourceUrl: `https://doi.org/${cleanDoi}`,
            reference: data.reference,
            rawResponse: data.rawResponse,
          };
        } else if (data.errorMessage) {
          return {
            success: false,
            providerName: this.name,
            errorMessage: data.errorMessage,
          };
        }
      }

      // Fallback: Direct public Crossref REST API fetch
      const directUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
      const directRes = await fetch(directUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ResearchManuscriptStudio/1.0 (mailto:support.prohit@gmail.com)',
        },
      });

      if (!directRes.ok) {
        if (directRes.status === 404) {
          return {
            success: false,
            providerName: this.name,
            errorMessage: 'Metadata could not be verified from the selected source: DOI not found in Crossref registry.',
          };
        }
        return {
          success: false,
          providerName: this.name,
          errorMessage: `Metadata could not be verified from Crossref (HTTP ${directRes.status}).`,
        };
      }

      const json = await directRes.json();
      const message = json?.message;

      if (!message) {
        return {
          success: false,
          providerName: this.name,
          errorMessage: 'Metadata could not be verified from the selected source.',
        };
      }

      return {
        success: true,
        providerName: this.name,
        sourceUrl: `https://doi.org/${cleanDoi}`,
        reference: mapCrossrefMessageToProjectReference(message, cleanDoi),
        rawResponse: message,
      };
    } catch (err: any) {
      return {
        success: false,
        providerName: this.name,
        errorMessage: err.message || 'Metadata could not be verified from the selected source due to a network error.',
      };
    }
  }
}

/**
 * PubMed Provider
 * Queries NCBI E-Utilities for biomedical and life sciences literature
 */
export class PubMedProvider implements ReferenceMetadataProvider {
  id = 'pubmed';
  name = 'PubMed (NCBI)';
  description = 'Biomedical and clinical literature indexed by the National Center for Biotechnology Information.';

  async fetchByDoi(rawDoi: string): Promise<ReferenceMetadataProviderResult> {
    const cleanDoi = normalizeDoi(rawDoi);
    if (!cleanDoi) {
      return {
        success: false,
        providerName: this.name,
        errorMessage: 'Please enter a valid DOI.',
      };
    }

    try {
      // Query server route for PubMed lookup
      const res = await fetch('/api/references/enrich-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: cleanDoi, provider: 'pubmed' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reference) {
          return {
            success: true,
            providerName: this.name,
            sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(cleanDoi)}`,
            reference: data.reference,
          };
        }
      }

      return {
        success: false,
        providerName: this.name,
        errorMessage: 'Metadata could not be verified from the selected source.',
      };
    } catch (err: any) {
      return {
        success: false,
        providerName: this.name,
        errorMessage: err.message || 'Metadata could not be verified from PubMed.',
      };
    }
  }

  async fetchByPmid(rawPmid: string): Promise<ReferenceMetadataProviderResult> {
    const cleanPmid = rawPmid.replace(/[^0-9]/g, '').trim();
    if (!cleanPmid) {
      return {
        success: false,
        providerName: this.name,
        errorMessage: 'Please enter a valid PubMed ID (PMID).',
      };
    }

    try {
      const res = await fetch('/api/references/enrich-pmid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pmid: cleanPmid }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reference) {
          return {
            success: true,
            providerName: this.name,
            sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${cleanPmid}/`,
            reference: data.reference,
          };
        }
      }

      // Direct fallback to NCBI E-Summary
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${cleanPmid}&retmode=json`;
      const directRes = await fetch(url);
      if (!directRes.ok) {
        return {
          success: false,
          providerName: this.name,
          errorMessage: 'Metadata could not be verified from PubMed NCBI E-Utilities.',
        };
      }

      const json = await directRes.json();
      const resultObj = json?.result?.[cleanPmid];

      if (!resultObj || resultObj.error) {
        return {
          success: false,
          providerName: this.name,
          errorMessage: 'Metadata could not be verified from the selected source: PMID not found.',
        };
      }

      return {
        success: true,
        providerName: this.name,
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${cleanPmid}/`,
        reference: mapPubmedSummaryToProjectReference(resultObj, cleanPmid),
      };
    } catch (err: any) {
      return {
        success: false,
        providerName: this.name,
        errorMessage: err.message || 'Failed to query PubMed service.',
      };
    }
  }
}

/**
 * Maps Crossref JSON message to ProjectReference fields cleanly without fabrication
 */
export function mapCrossrefMessageToProjectReference(
  msg: any,
  doi: string
): Partial<ProjectReference> {
  // Title
  let title = '';
  if (Array.isArray(msg.title) && msg.title.length > 0) {
    title = msg.title[0];
  } else if (typeof msg.title === 'string') {
    title = msg.title;
  }
  // Strip potential XML/HTML tags in title
  title = title.replace(/<\/?[^>]+(>|$)/g, '').trim();

  // Authors
  const authors: ReferenceAuthor[] = [];
  if (Array.isArray(msg.author)) {
    for (const a of msg.author) {
      const given = (a.given || '').trim();
      const family = (a.family || '').trim();
      let fullName = family;
      if (given && family) {
        fullName = `${given} ${family}`;
      } else if (given) {
        fullName = given;
      } else if (a.name) {
        fullName = a.name;
      }

      let orcid = a.ORCID || undefined;
      if (orcid) {
        orcid = orcid.replace(/^https?:\/\/orcid\.org\//i, '');
      }

      let affiliation: string | undefined = undefined;
      if (Array.isArray(a.affiliation) && a.affiliation.length > 0) {
        affiliation = a.affiliation[0]?.name || undefined;
      }

      if (family || fullName) {
        authors.push({
          firstName: given || undefined,
          lastName: family || fullName,
          fullName,
          orcid,
          affiliation,
        });
      }
    }
  }

  // Journal / Container Title
  let journal = '';
  if (Array.isArray(msg['container-title']) && msg['container-title'].length > 0) {
    journal = msg['container-title'][0];
  } else if (typeof msg['container-title'] === 'string') {
    journal = msg['container-title'];
  }

  // Year
  let publicationYear: number | undefined = undefined;
  const dateParts =
    msg['published-print']?.['date-parts']?.[0] ||
    msg['published-online']?.['date-parts']?.[0] ||
    msg['issued']?.['date-parts']?.[0] ||
    msg['created']?.['date-parts']?.[0];

  if (Array.isArray(dateParts) && dateParts.length > 0 && typeof dateParts[0] === 'number') {
    publicationYear = dateParts[0];
  }

  // Volume, Issue, Pages
  const volume = msg.volume ? String(msg.volume) : undefined;
  const issue = msg.issue ? String(msg.issue) : undefined;
  const pages = msg.page ? String(msg.page).replace(/--/g, '–') : undefined;

  // Publisher
  const publisher = msg.publisher || undefined;

  // Abstract - strip JATS XML tags <jats:p>, <jats:sec>, etc.
  let abstract = msg.abstract || undefined;
  if (abstract) {
    abstract = abstract
      .replace(/<jats:title>[^<]*<\/jats:title>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // URL
  const url = msg.URL || `https://doi.org/${doi}`;

  // ISSN / ISBN
  const issn = Array.isArray(msg.ISSN) ? msg.ISSN[0] : msg.ISSN || undefined;
  const isbn = Array.isArray(msg.ISBN) ? msg.ISBN[0] : msg.ISBN || undefined;

  // Publication Type mapping
  let publicationType: PublicationType = 'article';
  const cType = (msg.type || '').toLowerCase();
  if (cType.includes('book') && !cType.includes('chapter')) {
    publicationType = 'book';
  } else if (cType.includes('chapter') || cType.includes('section')) {
    publicationType = 'chapter';
  } else if (cType.includes('proceeding') || cType.includes('conference')) {
    publicationType = 'conference';
  } else if (cType.includes('posted-content') || cType.includes('preprint')) {
    publicationType = 'preprint';
  } else if (cType.includes('dissertation') || cType.includes('thesis')) {
    publicationType = 'thesis';
  } else if (cType.includes('report')) {
    publicationType = 'report';
  } else if (cType.includes('dataset')) {
    publicationType = 'dataset';
  }

  // Auto citation key
  const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Author';
  const citationKey = publicationYear ? `${firstAuthor}${publicationYear}` : `${firstAuthor}Ref`;

  return {
    title: title || 'Untitled Crossref Record',
    authors,
    journal: journal || undefined,
    publicationYear,
    volume,
    issue,
    pages,
    doi,
    url,
    publisher,
    abstract,
    issn,
    isbn,
    publicationType,
    citationKey,
    sourceDatabase: 'crossref',
    metadataSource: 'crossref',
    metadataProvider: 'Crossref REST API',
    metadataSourceUrl: `https://doi.org/${doi}`,
    metadataRetrievedAt: new Date().toISOString(),
    verificationStatus: 'VERIFIED',
  };
}

/**
 * Maps PubMed summary JSON to ProjectReference fields
 */
export function mapPubmedSummaryToProjectReference(
  item: any,
  pmid: string
): Partial<ProjectReference> {
  const title = (item.title || '').replace(/<\/?[^>]+(>|$)/g, '').trim();

  const authors: ReferenceAuthor[] = [];
  if (Array.isArray(item.authors)) {
    for (const a of item.authors) {
      const name = a.name || '';
      if (name) {
        const parts = name.split(/\s+/);
        const lastName = parts[0] || name;
        const firstName = parts.slice(1).join(' ');
        authors.push({
          firstName: firstName || undefined,
          lastName,
          fullName: name,
        });
      }
    }
  }

  const journal = item.fulljournalname || item.source || undefined;

  let publicationYear: number | undefined = undefined;
  if (item.pubdate) {
    const yearMatch = String(item.pubdate).match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      publicationYear = parseInt(yearMatch[1], 10);
    }
  }

  const volume = item.volume || undefined;
  const issue = item.issue || undefined;
  const pages = item.pages || undefined;

  // Extract DOI from articleids
  let doi: string | undefined = undefined;
  if (Array.isArray(item.articleids)) {
    const doiObj = item.articleids.find((id: any) => id.idtype === 'doi');
    if (doiObj?.value) {
      doi = normalizeDoi(doiObj.value);
    }
  }

  const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Author';
  const citationKey = publicationYear ? `${firstAuthor}${publicationYear}` : `${firstAuthor}PMID`;

  return {
    title: title || 'Untitled PubMed Record',
    authors,
    journal,
    publicationYear,
    volume,
    issue,
    pages,
    doi,
    pmid,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    publicationType: 'article',
    citationKey,
    sourceDatabase: 'pubmed',
    metadataSource: 'pubmed',
    metadataProvider: 'PubMed NCBI E-Utilities',
    metadataSourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    metadataRetrievedAt: new Date().toISOString(),
    verificationStatus: 'VERIFIED',
  };
}

export const availableProviders: ReferenceMetadataProvider[] = [
  new CrossrefProvider(),
  new PubMedProvider(),
];
