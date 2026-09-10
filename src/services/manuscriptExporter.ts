import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  PageBreak,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageNumber,
  Header,
  Footer,
  convertInchesToTwip,
} from 'docx';
import { jsPDF } from 'jspdf';
import {
  Project,
  ManuscriptFormattingProfile,
  SupportedCitationStyle,
  ResearchFigure,
  ResearchTable,
} from '../types';
import {
  resolveProjectFormattingProfile,
  formatFigureCaptionLabel,
  formatTableCaptionLabel,
  formatSectionHeadingTitle,
} from '../data/formattingProfiles';
import {
  renderManuscriptWithFormattedCitations,
  generateReferencesList,
} from './citationFormatter';

/**
 * Sanitizes a title string for safe filesystem filename generation
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 40)
    .replace(/^_|_$/g, '') || 'Manuscript';
}

/**
 * Parses an inch string (e.g. "1.5 in", "1.0 in") to twips for docx
 */
function parseInchStringToTwip(str?: string, defaultInches = 1.0): number {
  if (!str) return convertInchesToTwip(defaultInches);
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return convertInchesToTwip(isNaN(num) || num <= 0 ? defaultInches : num);
}

/**
 * Parses an inch string (e.g. "1.5 in", "1.0 in") to points for jsPDF (72 pt = 1 inch)
 */
function parseInchStringToPt(str?: string, defaultInches = 1.0): number {
  if (!str) return defaultInches * 72;
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return (isNaN(num) || num <= 0 ? defaultInches : num) * 72;
}

/**
 * Triggers a client-side file download for a Blob
 */
function triggerBlobDownload(blob: Blob, filename: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

// ============================================================================
// DOCX EXPORTER
// ============================================================================

export async function exportManuscriptToDocx(
  project: Project,
  formattingProfile?: ManuscriptFormattingProfile,
  citationStyle?: SupportedCitationStyle
): Promise<{ blob: Blob; filename: string; doc: Document }> {
  const profile = formattingProfile || resolveProjectFormattingProfile(project);
  const activeStyle: SupportedCitationStyle =
    citationStyle ||
    (project.citationStyle as SupportedCitationStyle) ||
    profile.citationStyle ||
    'APA';

  const manuscript = project.manuscript;
  const sections = manuscript?.sections || [];
  const figures: ResearchFigure[] = project.figures || [];
  const tables: ResearchTable[] = project.tables || [];

  // Margins converted to twips (1 inch = 1440 twips)
  const topTwips = parseInchStringToTwip(profile.pageMargins.top, 1.0);
  const bottomTwips = parseInchStringToTwip(profile.pageMargins.bottom, 1.0);
  const leftTwips = parseInchStringToTwip(profile.pageMargins.left, 1.0); // e.g. 2160 twips for 1.5 in binding gutter
  const rightTwips = parseInchStringToTwip(profile.pageMargins.right, 1.0);

  // Typography settings
  const baseFontSizeHalfPt = profile.typography.baseFontSizePt * 2; // docx sizes are in half-points
  const lineSpacingTwip =
    profile.typography.lineSpacing === '2.0'
      ? 480
      : profile.typography.lineSpacing === '1.5'
      ? 360
      : profile.typography.lineSpacing === '1.15'
      ? 276
      : 240;

  const paragraphSpacingAfterTwip = profile.typography.paragraphSpacingPt * 20; // 1 pt = 20 dxa/twips
  const firstLineIndentTwip =
    profile.typography.paragraphIndent !== '0.0 in'
      ? parseInchStringToTwip(profile.typography.paragraphIndent, 0.5)
      : undefined;

  const docAlignment =
    profile.typography.textAlign === 'justify'
      ? AlignmentType.JUSTIFIED
      : AlignmentType.LEFT;

  const docxElements: (Paragraph | Table)[] = [];

  // --------------------------------------------------------------------------
  // 1. TITLE / COVER PAGE
  // --------------------------------------------------------------------------
  if (profile.titleAuthorArea.style === 'thesis_cover_page') {
    // Spacer paragraphs
    docxElements.push(new Paragraph({ spacing: { before: 720 } }));

    // Thesis Title
    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360 },
        children: [
          new TextRun({
            text: project.title.toUpperCase(),
            bold: true,
            size: profile.titleAuthorArea.titleFontSizePt * 2,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Horizontal divider
    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [
          new TextRun({
            text: '________________________________________',
            bold: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Degree Submission Statement
    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
        children: [
          new TextRun({
            text:
              profile.titleAuthorArea.degreeStatement ||
              'A Thesis Submitted in Partial Fulfillment of the Requirements for the Academic Degree',
            italics: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Author / Candidate
    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360, after: 120 },
        children: [
          new TextRun({
            text: 'Submitted By:\n',
            size: 20,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: 'Research Scholar\n',
            bold: true,
            size: 26,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Department & Institution
    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
        children: [
          new TextRun({
            text: `${profile.titleAuthorArea.departmentPlaceholder || 'Department of Advanced Scientific Research'}\n`,
            size: 22,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: `${profile.titleAuthorArea.institutionPlaceholder || 'Faculty of Graduate Studies & Research'}\n`,
            size: 22,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: `Academic Year ${new Date().getFullYear()}`,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Supervisory Committee Block (if enabled, e.g. PhD thesis)
    if (profile.titleAuthorArea.showCommitteeBlock) {
      docxElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 240 },
          children: [
            new TextRun({
              text: 'SUPERVISORY COMMITTEE APPROVAL',
              bold: true,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      // Committee approval table
      const committeeTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Principal Advisor: ____________________\nDate: ____________',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Co-Advisor / Reader: ____________________\nDate: ____________',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: { before: 240 },
                    children: [
                      new TextRun({
                        text: 'External Examiner: ____________________\nDate: ____________',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    spacing: { before: 240 },
                    children: [
                      new TextRun({
                        text: 'Department Chair: ____________________\nDate: ____________',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
      docxElements.push(committeeTable);
    }

    // Page break after thesis cover page
    docxElements.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  } else {
    // JOURNAL BANNER STYLE (General Research Paper)
    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: 'Original Research Manuscript  |  ISSN: 2456-9812 (Online)',
            size: 18,
            color: '666666',
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Title
    docxElements.push(
      new Paragraph({
        spacing: { before: 180, after: 240 },
        children: [
          new TextRun({
            text: project.title,
            bold: true,
            size: profile.titleAuthorArea.titleFontSizePt * 2,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Byline & Affiliation
    docxElements.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: 'Principal Investigator¹, Research Fellow¹,², Senior Analyst³\n',
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
          new TextRun({
            text: `¹ ${profile.titleAuthorArea.departmentPlaceholder || 'Department of Advanced Scientific Research, Academic Institute of Science'}\n`,
            size: 18,
            color: '444444',
            font: 'Times New Roman',
          }),
          new TextRun({
            text: '² Center for Empirical Methodological Investigation\n',
            size: 18,
            color: '444444',
            font: 'Times New Roman',
          }),
          new TextRun({
            text: '*Correspondence: research.author@academic-institute.edu',
            size: 18,
            italics: true,
            color: '555555',
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Abstract Box
    const abstractText =
      project.summary?.conclusion ||
      project.detailedDescription ||
      project.briefDescription ||
      'This study investigates fundamental hypotheses within the empirical domain, providing rigorous experimental verification and evidence-based synthesis.';

    docxElements.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: 'ABSTRACT',
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    docxElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: abstractText,
            size: 22,
            italics: true,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    if (project.keywords && project.keywords.length > 0) {
      docxElements.push(
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: 'Keywords: ',
              bold: true,
              size: 20,
              font: 'Times New Roman',
            }),
            new TextRun({
              text: project.keywords.join(', '),
              italics: true,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        })
      );
    }

    docxElements.push(
      new Paragraph({
        spacing: { after: 360 },
        children: [
          new TextRun({
            text: '_________________________________________________________________________',
            size: 16,
            color: '888888',
          }),
        ],
      })
    );
  }

  // --------------------------------------------------------------------------
  // 2. MANUSCRIPT SECTIONS (Headings, Body, In-Text Citations, Figures, Tables)
  // --------------------------------------------------------------------------
  const h1Rules = profile.headingHierarchy.h1;

  sections.forEach((sec, idx) => {
    // Formatted heading according to profile hierarchy (e.g. "Chapter 1: ..." or "1. Introduction")
    const formattedTitle = formatSectionHeadingTitle(sec.title, idx, profile, true);

    docxElements.push(
      new Paragraph({
        alignment:
          h1Rules.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: {
          before: h1Rules.spacingBeforePt * 20,
          after: h1Rules.spacingAfterPt * 20,
        },
        children: [
          new TextRun({
            text: formattedTitle,
            bold: h1Rules.fontWeight === 'bold',
            size: h1Rules.fontSizePt * 2,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Render section paragraphs with formatted in-text citations
    const formattedContent = renderManuscriptWithFormattedCitations(
      sec.content,
      project,
      activeStyle
    );

    const paragraphs = formattedContent.split('\n\n');
    paragraphs.forEach((pText) => {
      const trimmed = pText.trim();
      if (!trimmed) return;

      docxElements.push(
        new Paragraph({
          alignment: docAlignment,
          indent: firstLineIndentTwip
            ? { firstLine: firstLineIndentTwip }
            : undefined,
          spacing: {
            line: lineSpacingTwip,
            after: paragraphSpacingAfterTwip,
          },
          children: [
            new TextRun({
              text: trimmed,
              size: baseFontSizeHalfPt,
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });

    // Embed associated figures for this section
    const matchingFigures = figures.filter((f, fIdx) => {
      // If section has linked figures or distribute by index
      if (sec.sourceFigures?.includes(f.id)) return true;
      return idx === 1 && fIdx === 0; // Default placement in methodology/results
    });

    matchingFigures.forEach((fig, fIdx) => {
      const captionText = `${formatFigureCaptionLabel(fIdx + 1, profile, idx + 1)} ${fig.caption || fig.title || 'Experimental Visual Data'}`;

      // Figure representation box
      docxElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: `[ Figure: ${fig.title || 'Experimental Visual Data'} ]`,
              bold: true,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      // Figure caption
      docxElements.push(
        new Paragraph({
          alignment:
            profile.captions.align === 'center'
              ? AlignmentType.CENTER
              : AlignmentType.LEFT,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: captionText,
              italics: profile.captions.italic,
              size: profile.captions.fontSizePt * 2,
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });

    // Embed associated tables for this section
    const matchingTables = tables.filter((t, tIdx) => {
      if (sec.sourceTables?.includes(t.id)) return true;
      return idx === 2 && tIdx === 0; // Default placement in findings/results
    });

    matchingTables.forEach((tab, tIdx) => {
      const captionText = `${formatTableCaptionLabel(tIdx + 1, profile, idx + 1)} ${tab.caption || tab.title || 'Summary Data'}`;

      // Table Caption (usually above according to profile)
      docxElements.push(
        new Paragraph({
          alignment:
            profile.captions.align === 'center'
              ? AlignmentType.CENTER
              : AlignmentType.LEFT,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: captionText,
              bold: profile.captions.boldLabel,
              italics: profile.captions.italic,
              size: profile.captions.fontSizePt * 2,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      // Construct Docx Table
      const headers = tab.headers && tab.headers.length > 0
        ? tab.headers
        : ['Variable / Metric', 'Control Group', 'Experimental Group', 'p-value'];

      const rowsData = tab.rows && tab.rows.length > 0
        ? tab.rows
        : [
            ['Sample Size (N)', '150', '150', '—'],
            ['Mean Outcome Score', '42.3 ± 4.1', '58.7 ± 3.8', 'p < 0.001'],
            ['Standard Deviation', '3.4', '3.1', '0.042'],
          ];

      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(
          (h) =>
            new TableCell({
              shading: { fill: 'F0F0EE' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: h,
                      bold: true,
                      size: 20,
                      font: 'Times New Roman',
                    }),
                  ],
                }),
              ],
            })
        ),
      });

      const dataRows = rowsData.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      children: [
                        new TextRun({
                          text: cell,
                          size: 20,
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
      );

      const docxTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
      });

      docxElements.push(docxTable);

      // Table footnotes
      if (tab.footnotes || tab.notes) {
        docxElements.push(
          new Paragraph({
            spacing: { before: 120, after: 240 },
            children: [
              new TextRun({
                text: `Note: ${tab.footnotes || tab.notes}`,
                italics: true,
                size: 18,
                font: 'Times New Roman',
              }),
            ],
          })
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. REFERENCES / BIBLIOGRAPHY SECTION
  // --------------------------------------------------------------------------
  docxElements.push(
    new Paragraph({
      alignment:
        profile.headingHierarchy.h1.align === 'center'
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
      spacing: {
        before: profile.headingHierarchy.h1.spacingBeforePt * 20,
        after: profile.headingHierarchy.h1.spacingAfterPt * 20,
      },
      children: [
        new TextRun({
          text: (profile.referenceListSettings.title || 'References').toUpperCase(),
          bold: true,
          size: profile.headingHierarchy.h1.fontSizePt * 2,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  const formattedBibliography = generateReferencesList(project, activeStyle);

  if (formattedBibliography.length === 0) {
    docxElements.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: 'No references cited in manuscript.',
            italics: true,
            size: baseFontSizeHalfPt,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  } else {
    // Hanging indent: 0.5 in = 720 twips
    const hangingIndentTwips = parseInchStringToTwip(
      profile.referenceListSettings.hangingIndent,
      0.5
    );

    formattedBibliography.forEach((entry) => {
      docxElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: {
            left: hangingIndentTwips,
            hanging: hangingIndentTwips,
          },
          spacing: {
            line:
              profile.referenceListSettings.lineSpacing === '2.0'
                ? 480
                : profile.referenceListSettings.lineSpacing === '1.5'
                ? 360
                : 240,
            after: profile.referenceListSettings.spacingBetweenEntriesPt * 20,
          },
          children: [
            new TextRun({
              text: entry.formattedText,
              size: (profile.typography.baseFontSizePt - 1) * 2,
              font: 'Times New Roman',
            }),
          ],
        })
      );
    });
  }

  // --------------------------------------------------------------------------
  // 4. CREATE DOCUMENT & PACK BLOB
  // --------------------------------------------------------------------------
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: topTwips,
              bottom: bottomTwips,
              left: leftTwips,
              right: rightTwips,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${project.title.substring(0, 50)}${project.title.length > 50 ? '...' : ''}`,
                    italics: true,
                    size: 18,
                    color: '777777',
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 18,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 18,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        },
        children: docxElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = sanitizeFilename(project.title);
  const profileSlug = profile.shortName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanTitle}_${profileSlug}.docx`;
  triggerBlobDownload(blob, filename);
  return { blob, filename, doc };
}

// ============================================================================
// PDF EXPORTER
// ============================================================================

export async function exportManuscriptToPdf(
  project: Project,
  formattingProfile?: ManuscriptFormattingProfile,
  citationStyle?: SupportedCitationStyle
): Promise<{ pdf: jsPDF; filename: string; blob?: Blob; totalPages: number }> {
  const profile = formattingProfile || resolveProjectFormattingProfile(project);
  const activeStyle: SupportedCitationStyle =
    citationStyle ||
    (project.citationStyle as SupportedCitationStyle) ||
    profile.citationStyle ||
    'APA';

  const manuscript = project.manuscript;
  const sections = manuscript?.sections || [];
  const figures: ResearchFigure[] = project.figures || [];
  const tables: ResearchTable[] = project.tables || [];

  // Standard Letter dimensions in points (8.5 x 11 inches = 612 x 792 pt)
  const pageWidth = 612;
  const pageHeight = 792;

  // Margins in points
  const topMargin = parseInchStringToPt(profile.pageMargins.top, 1.0);
  const bottomMargin = parseInchStringToPt(profile.pageMargins.bottom, 1.0);
  const leftMargin = parseInchStringToPt(profile.pageMargins.left, 1.0); // 108 pt for 1.5 in binding gutter
  const rightMargin = parseInchStringToPt(profile.pageMargins.right, 1.0);
  const printableWidth = pageWidth - leftMargin - rightMargin;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  pdf.setFont('times', 'normal');

  let currentY = topMargin;

  // Helper to ensure vertical room or create a new page
  function ensureRoom(neededHeight: number): void {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      currentY = topMargin;
      renderRunningHeader();
    }
  }

  // Running header for body pages
  function renderRunningHeader(): void {
    pdf.setFont('times', 'italic');
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    const titleSnippet =
      project.title.length > 55
        ? `${project.title.substring(0, 52)}...`
        : project.title;
    pdf.text(titleSnippet, leftMargin, topMargin - 20);
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.5);
    pdf.line(leftMargin, topMargin - 15, leftMargin + printableWidth, topMargin - 15);
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('times', 'normal');
  }

  // --------------------------------------------------------------------------
  // 1. TITLE / COVER PAGE
  // --------------------------------------------------------------------------
  if (profile.titleAuthorArea.style === 'thesis_cover_page') {
    // Title
    pdf.setFont('times', 'bold');
    pdf.setFontSize(profile.titleAuthorArea.titleFontSizePt);
    const titleLines = pdf.splitTextToSize(project.title.toUpperCase(), printableWidth);
    
    currentY = topMargin + 40;
    titleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, currentY, { align: 'center' });
      currentY += profile.titleAuthorArea.titleFontSizePt * 1.3;
    });

    // Divider
    currentY += 15;
    pdf.setDrawColor(30, 30, 30);
    pdf.setLineWidth(1.5);
    pdf.line(pageWidth / 2 - 40, currentY, pageWidth / 2 + 40, currentY);
    currentY += 30;

    // Degree statement
    pdf.setFont('times', 'italic');
    pdf.setFontSize(12);
    const degreeStmt =
      profile.titleAuthorArea.degreeStatement ||
      'A Thesis Submitted in Partial Fulfillment of the Requirements for the Academic Degree';
    const degreeLines = pdf.splitTextToSize(degreeStmt, printableWidth - 60);
    degreeLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, currentY, { align: 'center' });
      currentY += 18;
    });

    currentY += 40;

    // Candidate / Author
    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    pdf.text('Author / Candidate:', pageWidth / 2, currentY, { align: 'center' });
    currentY += 16;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(14);
    pdf.text('Research Scholar', pageWidth / 2, currentY, { align: 'center' });
    currentY += 35;

    // Department & Institution
    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    const dept =
      profile.titleAuthorArea.departmentPlaceholder ||
      'Department of Advanced Scientific Research';
    const inst =
      profile.titleAuthorArea.institutionPlaceholder ||
      'Faculty of Graduate Studies & Research';
    pdf.text(dept, pageWidth / 2, currentY, { align: 'center' });
    currentY += 16;
    pdf.text(inst, pageWidth / 2, currentY, { align: 'center' });
    currentY += 16;
    pdf.text(`Academic Year: ${new Date().getFullYear()}`, pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 40;

    // Supervisory committee approval block
    if (profile.titleAuthorArea.showCommitteeBlock) {
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(leftMargin + 20, currentY, leftMargin + printableWidth - 20, currentY);
      currentY += 15;

      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.text('SUPERVISORY COMMITTEE APPROVAL', pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 25;

      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      const colWidth = (printableWidth - 40) / 2;
      const col1X = leftMargin + 20;
      const col2X = col1X + colWidth + 20;

      pdf.text('Principal Advisor: ____________________', col1X, currentY);
      pdf.text('Co-Advisor / Reader: ____________________', col2X, currentY);
      currentY += 25;
      pdf.text('External Examiner: ____________________', col1X, currentY);
      pdf.text('Department Chair: ____________________', col2X, currentY);
    }

    // Move to next page for body
    pdf.addPage();
    currentY = topMargin;
    renderRunningHeader();
  } else {
    // JOURNAL BANNER STYLE
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('ORIGINAL RESEARCH MANUSCRIPT', leftMargin, currentY);
    pdf.text('ISSN: 2456-9812 (Online)', leftMargin + printableWidth, currentY, {
      align: 'right',
    });
    currentY += 8;

    pdf.setDrawColor(30, 30, 30);
    pdf.setLineWidth(1.5);
    pdf.line(leftMargin, currentY, leftMargin + printableWidth, currentY);
    currentY += 20;

    // Title
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(profile.titleAuthorArea.titleFontSizePt);
    const titleLines = pdf.splitTextToSize(project.title, printableWidth);
    titleLines.forEach((line: string) => {
      pdf.text(line, leftMargin, currentY);
      currentY += profile.titleAuthorArea.titleFontSizePt * 1.25;
    });

    currentY += 10;

    // Byline
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text(
      'Principal Investigator¹*, Research Fellow¹,², Senior Analyst³',
      leftMargin,
      currentY
    );
    currentY += 14;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text(
      `¹ ${profile.titleAuthorArea.departmentPlaceholder || 'Department of Applied Sciences, Academic Research Institute'}`,
      leftMargin,
      currentY
    );
    currentY += 12;
    pdf.text(
      '² Center for Advanced Methodological Investigation',
      leftMargin,
      currentY
    );
    currentY += 12;
    pdf.text(
      '*Correspondence: research.author@academic-institute.edu',
      leftMargin,
      currentY
    );
    currentY += 18;

    // Abstract Box
    const abstractText =
      project.summary?.conclusion ||
      project.detailedDescription ||
      project.briefDescription ||
      'This study investigates fundamental hypotheses within the empirical domain, providing rigorous experimental verification and evidence-based synthesis.';

    pdf.setFillColor(250, 249, 247);
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.5);

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    const abstractLines = pdf.splitTextToSize(abstractText, printableWidth - 24);
    const boxHeight = abstractLines.length * 14 + 40;

    pdf.rect(leftMargin, currentY, printableWidth, boxHeight, 'FD');

    const insideY = currentY + 16;
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('ABSTRACT', leftMargin + 12, insideY);

    let absLineY = insideY + 14;
    pdf.setFont('times', 'italic');
    pdf.setFontSize(9.5);
    abstractLines.forEach((line: string) => {
      pdf.text(line, leftMargin + 12, absLineY);
      absLineY += 14;
    });

    currentY += boxHeight + 15;

    // Keywords
    if (project.keywords && project.keywords.length > 0) {
      pdf.setFont('times', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(20, 20, 20);
      const kwPrefix = 'Keywords: ';
      pdf.text(kwPrefix, leftMargin, currentY);
      const prefixWidth = pdf.getTextWidth(kwPrefix);
      pdf.setFont('times', 'italic');
      pdf.setTextColor(70, 70, 70);
      pdf.text(project.keywords.join(', '), leftMargin + prefixWidth, currentY);
      currentY += 20;
    }
  }

  // --------------------------------------------------------------------------
  // 2. MANUSCRIPT SECTIONS (Body, Citations, Figures, Tables)
  // --------------------------------------------------------------------------
  const baseFontSize = profile.typography.baseFontSizePt;
  const lineSpacing = parseFloat(profile.typography.lineSpacing) || 1.5;
  const paragraphIndent =
    profile.typography.paragraphIndent !== '0.0 in'
      ? parseInchStringToPt(profile.typography.paragraphIndent, 0.5)
      : 0;

  sections.forEach((sec, idx) => {
    // Heading
    const headingText = formatSectionHeadingTitle(sec.title, idx, profile, true);
    const headingSize = profile.headingHierarchy.h1.fontSizePt;

    ensureRoom(headingSize * 2 + 30);

    pdf.setFont('times', 'bold');
    pdf.setFontSize(headingSize);
    pdf.setTextColor(20, 20, 20);

    if (profile.headingHierarchy.h1.align === 'center') {
      pdf.text(headingText, pageWidth / 2, currentY, { align: 'center' });
    } else {
      pdf.text(headingText, leftMargin, currentY);
    }
    currentY += headingSize + 8;

    // Subtle divider below heading
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.5);
    pdf.line(leftMargin, currentY, leftMargin + printableWidth, currentY);
    currentY += 12;

    // Paragraphs with citations
    const formattedContent = renderManuscriptWithFormattedCitations(
      sec.content,
      project,
      activeStyle
    );

    const paragraphs = formattedContent.split('\n\n');
    pdf.setFont('times', 'normal');
    pdf.setFontSize(baseFontSize);
    const lineHeightPt = baseFontSize * lineSpacing;

    paragraphs.forEach((para) => {
      const trimmed = para.trim();
      if (!trimmed) return;

      // Split lines respecting printable width
      const lines = pdf.splitTextToSize(
        trimmed,
        paragraphIndent > 0 ? printableWidth - paragraphIndent : printableWidth
      );

      lines.forEach((line: string, lIdx: number) => {
        ensureRoom(lineHeightPt);
        const xPos = lIdx === 0 ? leftMargin + paragraphIndent : leftMargin;
        pdf.text(line, xPos, currentY);
        currentY += lineHeightPt;
      });

      currentY += profile.typography.paragraphSpacingPt || 6;
    });

    // Figures
    const matchingFigures = figures.filter((f, fIdx) => {
      if (sec.sourceFigures?.includes(f.id)) return true;
      return idx === 1 && fIdx === 0;
    });

    matchingFigures.forEach((fig, fIdx) => {
      ensureRoom(140);
      currentY += 10;

      // Figure representation frame
      pdf.setFillColor(248, 247, 245);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(leftMargin, currentY, printableWidth, 75, 'FD');

      pdf.setFont('times', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text(
        `[ Figure Canvas Representation: ${fig.title || 'Experimental Visual Data'} ]`,
        pageWidth / 2,
        currentY + 42,
        { align: 'center' }
      );
      currentY += 85;

      // Caption
      const capLabel = formatFigureCaptionLabel(fIdx + 1, profile, idx + 1);
      const capText = `${capLabel} ${fig.caption || fig.title || 'Empirical measurement data distribution.'}`;

      pdf.setFont('times', profile.captions.italic ? 'italic' : 'normal');
      pdf.setFontSize(profile.captions.fontSizePt);
      pdf.setTextColor(40, 40, 40);

      const capLines = pdf.splitTextToSize(capText, printableWidth);
      capLines.forEach((cLine: string) => {
        ensureRoom(14);
        if (profile.captions.align === 'center') {
          pdf.text(cLine, pageWidth / 2, currentY, { align: 'center' });
        } else {
          pdf.text(cLine, leftMargin, currentY);
        }
        currentY += 14;
      });

      currentY += 12;
    });

    // Tables
    const matchingTables = tables.filter((t, tIdx) => {
      if (sec.sourceTables?.includes(t.id)) return true;
      return idx === 2 && tIdx === 0;
    });

    matchingTables.forEach((tab, tIdx) => {
      ensureRoom(130);
      currentY += 10;

      // Table caption (above)
      const tabCapLabel = formatTableCaptionLabel(tIdx + 1, profile, idx + 1);
      const tabCapText = `${tabCapLabel} ${tab.caption || tab.title || 'Summary Data'}`;

      pdf.setFont('times', 'bold');
      pdf.setFontSize(profile.captions.fontSizePt);
      pdf.setTextColor(30, 30, 30);
      const capLines = pdf.splitTextToSize(tabCapText, printableWidth);
      capLines.forEach((cLine: string) => {
        ensureRoom(14);
        pdf.text(cLine, leftMargin, currentY);
        currentY += 14;
      });

      currentY += 6;

      // Table grid
      const headers =
        tab.headers && tab.headers.length > 0
          ? tab.headers
          : ['Variable / Metric', 'Control Group', 'Experimental Group', 'p-value'];

      const rowsData =
        tab.rows && tab.rows.length > 0
          ? tab.rows
          : [
              ['Sample Size (N)', '150', '150', '—'],
              ['Mean Outcome Score', '42.3 ± 4.1', '58.7 ± 3.8', 'p < 0.001'],
              ['Standard Deviation', '3.4', '3.1', '0.042'],
            ];

      const colCount = headers.length;
      const colWidth = printableWidth / colCount;
      const rowHeight = 20;

      // Header row
      pdf.setFillColor(240, 240, 238);
      pdf.rect(leftMargin, currentY, printableWidth, rowHeight, 'F');
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.5);
      pdf.rect(leftMargin, currentY, printableWidth, rowHeight, 'S');

      pdf.setFont('times', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(20, 20, 20);

      headers.forEach((h, hIdx) => {
        const cellX = leftMargin + hIdx * colWidth + 4;
        pdf.text(h, cellX, currentY + 14);
      });
      currentY += rowHeight;

      // Data rows
      pdf.setFont('times', 'normal');
      pdf.setFontSize(9);
      rowsData.forEach((row) => {
        ensureRoom(rowHeight);
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(leftMargin, currentY, printableWidth, rowHeight, 'S');
        row.forEach((cell, cIdx) => {
          const cellX = leftMargin + cIdx * colWidth + 4;
          pdf.text(cell, cellX, currentY + 14);
        });
        currentY += rowHeight;
      });

      // Footnotes
      if (tab.footnotes || tab.notes) {
        currentY += 6;
        pdf.setFont('times', 'italic');
        pdf.setFontSize(8.5);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`Note: ${tab.footnotes || tab.notes}`, leftMargin, currentY);
        currentY += 14;
      }

      currentY += 12;
    });
  });

  // --------------------------------------------------------------------------
  // 3. REFERENCES / BIBLIOGRAPHY SECTION
  // --------------------------------------------------------------------------
  ensureRoom(60);
  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(1.2);
  pdf.line(leftMargin, currentY, leftMargin + printableWidth, currentY);
  currentY += 20;

  pdf.setFont('times', 'bold');
  pdf.setFontSize(profile.headingHierarchy.h1.fontSizePt);
  pdf.setTextColor(20, 20, 20);
  const refHeading = (profile.referenceListSettings.title || 'References').toUpperCase();

  if (profile.headingHierarchy.h1.align === 'center') {
    pdf.text(refHeading, pageWidth / 2, currentY, { align: 'center' });
  } else {
    pdf.text(refHeading, leftMargin, currentY);
  }
  currentY += profile.headingHierarchy.h1.fontSizePt + 12;

  const bibliography = generateReferencesList(project, activeStyle);

  if (bibliography.length === 0) {
    pdf.setFont('times', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('No references cited in manuscript yet.', leftMargin, currentY);
    currentY += 20;
  } else {
    const hangingIndentPt = parseInchStringToPt(
      profile.referenceListSettings.hangingIndent,
      0.5
    );

    pdf.setFont('times', 'normal');
    pdf.setFontSize(baseFontSize - 1);
    pdf.setTextColor(30, 30, 30);
    const refLineHeight = (baseFontSize - 1) * 1.35;

    bibliography.forEach((entry) => {
      const entryLines = pdf.splitTextToSize(
        entry.formattedText,
        printableWidth - hangingIndentPt
      );

      entryLines.forEach((line: string, lIdx: number) => {
        ensureRoom(refLineHeight);
        const xPos = lIdx === 0 ? leftMargin : leftMargin + hangingIndentPt;
        pdf.text(line, xPos, currentY);
        currentY += refLineHeight;
      });

      currentY += profile.referenceListSettings.spacingBetweenEntriesPt || 6;
    });
  }

  // --------------------------------------------------------------------------
  // 4. ADD PAGE NUMBERS TO ALL PAGES
  // --------------------------------------------------------------------------
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);

    // On thesis cover page (page 1), standard academic format omits page number
    if (p === 1 && profile.titleAuthorArea.style === 'thesis_cover_page') {
      continue;
    }

    const pageStr = `Page ${p} of ${totalPages}`;
    pdf.text(pageStr, leftMargin + printableWidth, pageHeight - bottomMargin + 25, {
      align: 'right',
    });

    pdf.text(
      `${profile.name} — RePa Academic Engine`,
      leftMargin,
      pageHeight - bottomMargin + 25
    );
  }

  const cleanTitle = sanitizeFilename(project.title);
  const profileSlug = profile.shortName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanTitle}_${profileSlug}.pdf`;
  let blob: Blob | undefined;
  try {
    blob = pdf.output('blob');
  } catch {
    // Non-browser or mock environment fallback
  }

  if (typeof window !== 'undefined' && typeof pdf.save === 'function') {
    pdf.save(filename);
  }
  return { pdf, filename, blob, totalPages };
}
