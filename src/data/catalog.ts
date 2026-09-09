import { DocumentTypeOption, FormatSpecification } from '../types';

export const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  {
    key: 'research_article',
    title: 'Research Article',
    category: 'Journal Articles',
    description: 'Standard full-length peer-reviewed empirical or theoretical academic paper presenting novel research findings.',
    defaultSections: ['Title', 'Abstract', 'Keywords', 'Introduction', 'Materials and Methods', 'Results', 'Discussion', 'Conclusion', 'Limitations', 'Future Work', 'References'],
    recommendedWordRange: '4,000 - 8,000 words'
  },
  {
    key: 'original_research_paper',
    title: 'Original Research Paper',
    category: 'Journal Articles',
    description: 'Primary report of original empirical experimental, computational or field investigation with complete methodology.',
    defaultSections: ['Title', 'Abstract', 'Keywords', 'Introduction', 'Theoretical Framework', 'Materials and Methods', 'Results', 'Discussion', 'Conclusion', 'References', 'Appendices'],
    recommendedWordRange: '5,000 - 10,000 words'
  },
  {
    key: 'review_article',
    title: 'Review Article',
    category: 'Journal Articles',
    description: 'Comprehensive, critical synthesis and evaluation of published literature in a defined scientific domain.',
    defaultSections: ['Title', 'Abstract', 'Keywords', 'Introduction', 'Methodology of Literature Search', 'Thematic Review Sections', 'Synthesis & Critical Analysis', 'Challenges & Open Questions', 'Conclusion & Future Outlook', 'References'],
    recommendedWordRange: '6,000 - 12,000 words'
  },
  {
    key: 'systematic_review',
    title: 'Systematic Review',
    category: 'Journal Articles',
    description: 'Rigorous, PRISMA-guided protocolized synthesis of empirical evidence according to predefined eligibility criteria.',
    defaultSections: ['Title', 'Structured Abstract', 'Introduction', 'Protocol and Registration', 'Eligibility Criteria', 'Information Sources & Search Strategy', 'Study Selection', 'Data Collection & Extraction', 'Risk of Bias Assessment', 'Results of Synthesis', 'Discussion', 'Limitations', 'Conclusions', 'References'],
    recommendedWordRange: '6,000 - 10,000 words'
  },
  {
    key: 'meta_analysis',
    title: 'Meta-Analysis',
    category: 'Journal Articles',
    description: 'Quantitative statistical synthesis combining numeric results from multiple independent scientific investigations.',
    defaultSections: ['Title', 'Abstract', 'Introduction', 'Methods & Inclusion Criteria', 'Statistical Methods & Effect Sizes', 'Heterogeneity & Sensitivity Analysis', 'Pooled Results', 'Publication Bias Assessment', 'Discussion', 'Clinical / Theoretical Implications', 'References'],
    recommendedWordRange: '5,000 - 9,000 words'
  },
  {
    key: 'case_report',
    title: 'Case Report',
    category: 'Journal Articles',
    description: 'Detailed clinical, educational, or engineering examination of a singular unique subject, patient, or incident.',
    defaultSections: ['Title', 'Abstract', 'Introduction', 'Case Presentation & History', 'Diagnostic Assessment & Investigations', 'Intervention & Management', 'Follow-up and Outcomes', 'Discussion', 'Patient Perspective / Ethical Consent', 'References'],
    recommendedWordRange: '1,500 - 3,000 words'
  },
  {
    key: 'case_study',
    title: 'Case Study',
    category: 'Journal Articles',
    description: 'In-depth empirical inquiry into a contemporary real-world phenomenon within its real-world context.',
    defaultSections: ['Title', 'Abstract', 'Introduction', 'Context & Case Background', 'Methodology & Data Collection', 'Case Findings', 'Cross-Case Analysis', 'Discussion & Managerial/Theoretical Implications', 'Conclusions', 'References'],
    recommendedWordRange: '4,000 - 7,000 words'
  },
  {
    key: 'conference_paper',
    title: 'Conference Paper',
    category: 'Technical & Reports',
    description: 'Concise, high-impact research manuscript designed for proceedings publication and academic conference presentation.',
    defaultSections: ['Title', 'Abstract', 'Keywords', 'Introduction', 'Related Work', 'Proposed Method / Architecture', 'Experimental Setup & Evaluation', 'Results Analysis', 'Conclusion', 'References'],
    recommendedWordRange: '3,000 - 5,000 words'
  },
  {
    key: 'technical_paper',
    title: 'Technical Paper',
    category: 'Technical & Reports',
    description: 'Specialized document describing technical processes, engineering designs, algorithms, or benchmark evaluations.',
    defaultSections: ['Title', 'Executive Summary', 'Introduction', 'System Architecture & Design', 'Implementation Details', 'Benchmarking & Performance', 'Deployment & Scalability', 'Conclusion', 'References'],
    recommendedWordRange: '4,000 - 8,000 words'
  },
  {
    key: 'masters_thesis',
    title: "Master's Thesis",
    category: 'Theses & Dissertations',
    description: 'Formal academic treatise submitted for the fulfillment of a Postgraduate Master of Science / Master of Arts degree.',
    defaultSections: ['Title Page', 'Declaration & Abstract', 'Acknowledgments', 'Table of Contents', 'Chapter 1: Introduction & Research Aims', 'Chapter 2: Literature Review', 'Chapter 3: Methodology & Experimental Design', 'Chapter 4: Results & Data Analysis', 'Chapter 5: Discussion', 'Chapter 6: Conclusions & Recommendations', 'References', 'Appendices'],
    recommendedWordRange: '15,000 - 35,000 words'
  },
  {
    key: 'masters_dissertation',
    title: "Master's Dissertation",
    category: 'Theses & Dissertations',
    description: 'In-depth research monograph showcasing independent investigation, structured research rigor, and analytical mastery.',
    defaultSections: ['Title Page', 'Abstract', 'Table of Contents', 'Chapter 1: Problem Statement', 'Chapter 2: Conceptual Framework', 'Chapter 3: Research Design', 'Chapter 4: Empirical Findings', 'Chapter 5: Discussion & Implications', 'Chapter 6: Summary', 'References', 'Appendices'],
    recommendedWordRange: '12,000 - 25,000 words'
  },
  {
    key: 'phd_thesis',
    title: 'PhD Thesis',
    category: 'Theses & Dissertations',
    description: 'Major doctoral thesis presenting an original, significant contribution to scientific knowledge and theoretical advancement.',
    defaultSections: ['Title Page', 'Abstract', 'Dedication & Acknowledgments', 'List of Figures & Tables', 'Chapter 1: Introduction & Research Scope', 'Chapter 2: Comprehensive Literature Review', 'Chapter 3: Theoretical & Methodological Paradigm', 'Chapter 4: Study 1 / Empirical Investigation', 'Chapter 5: Study 2 / Experimental Findings', 'Chapter 6: General Discussion & Theoretical Contributions', 'Chapter 7: Conclusion, Policy Implications & Future Horizons', 'References', 'Appendices'],
    recommendedWordRange: '40,000 - 80,000 words'
  },
  {
    key: 'phd_dissertation',
    title: 'PhD Dissertation',
    category: 'Theses & Dissertations',
    description: 'Exhaustive doctoral monograph defending original research hypotheses with extensive validation and literature integration.',
    defaultSections: ['Title Page', 'Abstract', 'Table of Contents', 'Chapter 1: Introduction', 'Chapter 2: Critical Literature Foundation', 'Chapter 3: Materials, Methods & Proofs', 'Chapter 4: Empirical Findings & Validation', 'Chapter 5: In-Depth Discussion', 'Chapter 6: Synthesis & Concluding Remarks', 'References', 'Appendices'],
    recommendedWordRange: '45,000 - 90,000 words'
  },
  {
    key: 'project_report',
    title: 'Project Report',
    category: 'Technical & Reports',
    description: 'Structured report detailing the objectives, execution, milestones, and outcomes of a funded research project.',
    defaultSections: ['Title Page', 'Executive Summary', 'Project Objectives', 'Milestones & Timeline', 'Methodology & Work Packages', 'Key Deliverables & Findings', 'Budget & Resource Utilization', 'Impact & Conclusions', 'References'],
    recommendedWordRange: '3,000 - 10,000 words'
  },
  {
    key: 'technical_report',
    title: 'Technical Report',
    category: 'Technical & Reports',
    description: 'Authoritative report released by an institution, laboratory, or research group documenting technical breakthroughs.',
    defaultSections: ['Title', 'Abstract', 'Introduction', 'Technical Problem Definition', 'Proposed Framework / Solution', 'Verification & Test Data', 'Operational Guidelines', 'Conclusion', 'References'],
    recommendedWordRange: '3,500 - 7,500 words'
  },
  {
    key: 'custom_academic_document',
    title: 'Custom Academic Document',
    category: 'Custom',
    description: 'Tailored academic structure customized to your specific institution, grant agency, or laboratory requirements.',
    defaultSections: ['Title', 'Abstract', 'Keywords', 'Introduction', 'Core Research Body', 'Discussion', 'Conclusion', 'References'],
    recommendedWordRange: 'Configurable'
  }
];

export const FORMAT_SPECIFICATIONS: FormatSpecification[] = [
  {
    id: 'fmt-ieee-trans',
    name: 'IEEE Transactions Style (Representative)',
    category: 'journal',
    organization: 'Institute of Electrical and Electronics Engineers',
    publisher: 'IEEE',
    documentTypeSupport: ['research_article', 'original_research_paper', 'conference_paper', 'technical_paper'],
    citationStyle: 'IEEE',
    referenceStyleRules: 'Numbered sequential citation in bracket format [1], [2]. References listed numerically in order of first mention.',
    wordLimit: { min: 4000, max: 8000, recommended: 6500 },
    abstractLimit: { min: 150, max: 250 },
    fontRules: { family: 'Times New Roman', sizePt: 10, lineSpacing: '1.0 (Two-column layout representation)' },
    marginRules: { top: '0.75 in', bottom: '1.0 in', left: '0.625 in', right: '0.625 in' },
    headingRules: 'Roman numerals for primary sections (I. INTRODUCTION), capitalized letters for secondary (A. System Model).',
    figureRequirements: 'Captions below figures (Fig. 1. Description). Vector or 300+ DPI TIFF/EPS.',
    tableRequirements: 'Captions centered above tables in small caps (TABLE I: SUMMARY OF PARAMETERS).',
    supplementaryMaterialRequirements: 'Separate multimedia or supplementary data file up to 100MB.',
    submissionRequirements: 'Anonymized or standard manuscript with author bios and photographs.',
    isPlaceholder: true,
    disclaimer: 'Representative placeholder format based on common IEEE guidelines. For official submissions, consult IEEE Author Center.'
  },
  {
    id: 'fmt-nature-springer',
    name: 'Nature / Springer Academic Style (Representative)',
    category: 'journal',
    organization: 'Springer Nature',
    publisher: 'Nature Portfolio',
    documentTypeSupport: ['research_article', 'original_research_paper', 'review_article'],
    citationStyle: 'Vancouver',
    referenceStyleRules: 'Sequential superscript numbering without brackets. Direct citation style.',
    wordLimit: { min: 3000, max: 6000, recommended: 4500 },
    abstractLimit: { min: 150, max: 200 },
    fontRules: { family: 'Arial / Helvetica', sizePt: 11, lineSpacing: '1.5 line spacing' },
    marginRules: { top: '1.0 in', bottom: '1.0 in', left: '1.0 in', right: '1.0 in' },
    headingRules: 'Unnumbered bold headings. Clear hierarchy: Title, Major Headings, Subheadings.',
    figureRequirements: 'Figure legends should start with a brief title sentence in bold. Multi-panel figures labeled with lower-case bold letters a, b, c.',
    tableRequirements: 'Tables should be editable text with concise legend and footnote explanations.',
    supplementaryMaterialRequirements: 'Supplementary Information PDF with separate Methods section.',
    submissionRequirements: 'Double-spaced manuscript draft with continuous line numbering.',
    isPlaceholder: true,
    disclaimer: 'Representative placeholder format based on common Nature guidelines. Consult Nature Guide for Authors before formal submission.'
  },
  {
    id: 'fmt-elsevier-sciencedirect',
    name: 'Elsevier ScienceDirect Style (Representative)',
    category: 'journal',
    organization: 'Elsevier B.V.',
    publisher: 'Elsevier',
    documentTypeSupport: ['research_article', 'original_research_paper', 'review_article', 'systematic_review', 'meta_analysis'],
    citationStyle: 'APA',
    referenceStyleRules: 'Author-year format (Smith et al., 2024). Alphabetical reference list with full DOI links.',
    wordLimit: { min: 4500, max: 9000, recommended: 7000 },
    abstractLimit: { min: 150, max: 300 },
    fontRules: { family: 'Times New Roman / Calibri', sizePt: 12, lineSpacing: 'Double spaced' },
    marginRules: { top: '1.0 in', bottom: '1.0 in', left: '1.0 in', right: '1.0 in' },
    headingRules: 'Numbered decimal sections: 1. Introduction, 1.1 Background, 1.1.1 Sub-topic.',
    figureRequirements: 'High-resolution images (300-600 DPI), clearly labeled axes, TIFF/JPEG/PNG format.',
    tableRequirements: 'Single table numbering sequence, horizontal border rules only (no vertical lines).',
    supplementaryMaterialRequirements: 'Data files and supplementary figures indexed as Supplementary Material S1, S2.',
    submissionRequirements: 'Declaration of competing interest, author contribution statement (CRediT taxonomy).',
    isPlaceholder: true,
    disclaimer: 'Representative placeholder format based on Elsevier publishing conventions. Review specific journal Guide for Authors.'
  },
  {
    id: 'fmt-harvard-thesis',
    name: 'Harvard University Thesis Guidelines (Representative)',
    category: 'university',
    organization: 'Harvard University',
    publisher: 'Graduate School of Arts and Sciences',
    documentTypeSupport: ['masters_thesis', 'masters_dissertation', 'phd_thesis', 'phd_dissertation'],
    citationStyle: 'Harvard',
    referenceStyleRules: 'Harvard Author-Date referencing system with comprehensive bibliographical list.',
    wordLimit: { min: 20000, max: 80000, recommended: 50000 },
    abstractLimit: { min: 250, max: 350 },
    fontRules: { family: 'Georgia / Times New Roman', sizePt: 12, lineSpacing: 'Double spaced for body, single for block quotes' },
    marginRules: { top: '1.0 in', bottom: '1.0 in', left: '1.5 in (Binding margin)', right: '1.0 in' },
    headingRules: 'Chapter title uppercase bold centered. Section headings numbered by Chapter (e.g. 2.1, 2.2).',
    figureRequirements: 'Numbered sequentially per chapter (Figure 2.1, Figure 2.2). Descriptive captions below.',
    tableRequirements: 'Numbered sequentially per chapter (Table 3.1, Table 3.2). Table title placed above.',
    supplementaryMaterialRequirements: 'Appendices placed after References, labeled Appendix A, Appendix B.',
    submissionRequirements: 'Formal title page according to GSAS formatting, copyright page, abstract, table of contents.',
    isPlaceholder: true,
    disclaimer: 'Representative placeholder format modeled on general graduate school thesis specifications. Verify with your specific department.'
  },
  {
    id: 'fmt-mit-dissertation',
    name: 'MIT Thesis & Dissertation Standard (Representative)',
    category: 'university',
    organization: 'Massachusetts Institute of Technology',
    publisher: 'MIT Libraries / Graduate Education',
    documentTypeSupport: ['masters_thesis', 'phd_thesis', 'phd_dissertation'],
    citationStyle: 'IEEE',
    referenceStyleRules: 'Numbered or author-year depending on department; STEM departments typically use IEEE bracket numbering.',
    wordLimit: { min: 25000, max: 90000, recommended: 60000 },
    abstractLimit: { min: 200, max: 350 },
    fontRules: { family: 'Computer Modern / Times Roman', sizePt: 11, lineSpacing: '1.5 line spacing' },
    marginRules: { top: '1.0 in', bottom: '1.0 in', left: '1.25 in', right: '1.0 in' },
    headingRules: 'LaTeX-compatible hierarchical chapter and section numbering.',
    figureRequirements: 'High-resolution vector graphics (PDF/EPS) or high-contrast raster imagery.',
    tableRequirements: 'Formal scientific tables with standard booktabs formatting.',
    supplementaryMaterialRequirements: 'Data repositories and code availability linked via persistent archive (Zenodo/GitHub).',
    submissionRequirements: 'Signed thesis supervisor cover sheet, abstract, biographical note.',
    isPlaceholder: true,
    disclaimer: 'Representative placeholder format reflecting MIT thesis specifications. Consult official MIT thesis guidelines.'
  },
  {
    id: 'fmt-custom-academic',
    name: 'Universal Academic Standard (Customizable)',
    category: 'custom',
    organization: 'Institutional / General Academic',
    publisher: 'Independent',
    documentTypeSupport: [
      'research_article', 'original_research_paper', 'review_article', 'systematic_review',
      'meta_analysis', 'case_report', 'case_study', 'conference_paper', 'technical_paper',
      'masters_thesis', 'masters_dissertation', 'phd_thesis', 'phd_dissertation',
      'project_report', 'technical_report', 'custom_academic_document'
    ],
    citationStyle: 'APA',
    referenceStyleRules: 'Standard APA 7th Edition format with author-date citations and alphabetized reference list.',
    wordLimit: { min: 3000, max: 15000, recommended: 6000 },
    abstractLimit: { min: 150, max: 300 },
    fontRules: { family: 'Times New Roman / Calibri', sizePt: 12, lineSpacing: '1.5 line spacing' },
    marginRules: { top: '1.0 in', bottom: '1.0 in', left: '1.0 in', right: '1.0 in' },
    headingRules: 'Standard hierarchical headings: Heading 1 (Bold 16pt), Heading 2 (Bold 14pt), Heading 3 (Italic 12pt).',
    figureRequirements: 'Numbered sequentially (Figure 1, Figure 2) with clear descriptive captions.',
    tableRequirements: 'Numbered sequentially (Table 1, Table 2) with titles above and footnotes below.',
    supplementaryMaterialRequirements: 'Supplementary data clearly designated as Annex or Appendix.',
    submissionRequirements: 'Clean structured manuscript ready for review or departmental archiving.',
    isPlaceholder: true,
    disclaimer: 'General academic layout suitable for initial drafts, preprints, and flexible institutional customization.'
  }
];

export const DEMO_SAMPLE_PROJECTS = [
  {
    id: 'demo-biomed-hydrogel',
    title: 'Injectable Biomimetic Hydrogel for Sustained Localized Doxorubicin Delivery in Osteosarcoma Models',
    researchArea: 'Biomedical Engineering & Oncology',
    subField: 'Nanomedicine & Targeted Drug Delivery',
    objectives: 'To formulate and evaluate a thermosensitive chitosan-graphene oxide nanocomposite hydrogel for localized chemotherapy, minimizing systemic cardiotoxicity while sustaining therapeutic drug release over 28 days.',
    researchQuestions: 'How does the concentration of graphene oxide crosslinking affect the sol-gel transition kinetics, tensile modulus, and doxorubicin release rate under physiological pH conditions?',
    hypothesis: 'Incorporation of 0.5% (w/v) functionalized graphene oxide into glycol chitosan creates a shear-thinning, pH-responsive matrix that reduces burst release to <12% and maintains >80% localized tumor suppression in vitro.',
    briefDescription: 'Experimental study assessing a novel injectable smart hydrogel for localized anticancer drug delivery with in vitro release kinetics, cytotoxicity assays, and mechanical rheology.',
    detailedDescription: 'Osteosarcoma management is severely limited by the dose-limiting cardiotoxicity and nephrotoxicity of systemic doxorubicin administration. In this investigation, we synthesized a dual-network nanocomposite hydrogel via reversible Schiff-base and pi-pi stacking interactions. In vitro degradation, swelling ratios, drug entrapment efficiency (94.2 ± 1.8%), and rheological storage modulus (G\' = 3,420 Pa at 37°C) were quantified across three formulations (Gel-A 0.1% GO, Gel-B 0.3% GO, Gel-C 0.5% GO). Cytotoxicity against MG-63 osteosarcoma cells demonstrated an IC50 reduction from 4.8 µg/mL (free DOX) to 1.9 µg/mL (Gel-C sustained delivery over 72h). Flow cytometry confirmed significant apoptotic induction (68.4% late apoptosis in Gel-C vs 22.1% in control).',
    methodology: 'Hydrogel formulation synthesized via EDC/NHS crosslinking. Swelling and degradation measured gravimetrically in PBS (pH 7.4 and pH 5.5 at 37°C). Rheological frequency sweep (0.1–100 rad/s) on Anton Paar MCR 302. Drug release quantified by UV-Vis spectrophotometry at 480 nm. Cell viability of MG-63 and human dermal fibroblasts (HDF) evaluated via MTT assay across 24h, 48h, and 72h timepoints.',
    studyPopulationSample: 'MG-63 osteosarcoma cell lines (ATCC CRL-1427) and primary human dermal fibroblasts (HDF) in triplicate cultures (n=6 per group).',
    variables: 'Independent: Graphene oxide concentration (0.1, 0.3, 0.5% w/v), pH condition (5.5, 7.4); Dependent: Storage modulus (Pa), cumulative DOX release (%), cell viability (%); Control: Pure chitosan hydrogel and unencapsulated DOX.',
    majorFindings: '1. Gel-C exhibited rapid thermal gelation within 42 seconds at 37°C.\n2. Sustained biphasic release profile: 11.4% burst release within initial 12h followed by zero-order release through day 28 at acidic tumor microenvironment pH (5.5).\n3. Gel-C reduced MG-63 osteosarcoma cell viability to 14.3 ± 2.1% at 72 hours while preserving >82% viability in healthy fibroblasts.\n4. Compressive Young\'s modulus increased 3.8-fold compared to unreinforced chitosan control.',
    conclusion: 'The thermosensitive injectable hydrogel demonstrates superior localized drug retention, biocompatibility, and prolonged tumor cell apoptosis, offering a promising platform for post-surgical osteosarcoma resection cavity filling.',
    limitations: 'In vitro evaluation only; long-term degradation kinetics and in vivo orthotopic tumor regression in xenograft models require prospective preclinical evaluation.',
    keywords: ['Injectable Hydrogel', 'Biomimetic Nanocomposites', 'Osteosarcoma Chemotherapy', 'Doxorubicin Delivery', 'Sustained Release', 'Rheology'],
    documentTypeId: 'original_research_paper' as const,
    formatId: 'fmt-nature-springer',
    status: 'generated' as const
  },
  {
    id: 'demo-ai-genomics',
    title: 'Explainable Spatio-Temporal Graph Neural Networks for Multi-Omic Subtype Discovery in Colorectal Cancer',
    researchArea: 'Computational Biology & Artificial Intelligence',
    subField: 'Bioinformatics & Machine Learning',
    objectives: 'To develop and validate a topological Graph Neural Network (GNN) framework that integrates transcriptomic, somatic mutation, and spatial transcriptomics data to identify clinically actionable colorectal cancer subtypes.',
    researchQuestions: 'Can attention-weighted biological pathway graphs predict disease-free survival and immunotherapy response more accurately than classical unintegrated multi-omics models?',
    hypothesis: 'Incorporating protein-protein interaction (STRING v11.5) topology into a dual-channel spatial graph attention layer improves 5-year survival classification AUC by at least 15% and pinpoints validated immune-evasion gene hubs.',
    briefDescription: 'Development of an explainable deep learning architecture trained on 1,248 patient cohorts from TCGA and GEO datasets for robust molecular subtyping.',
    detailedDescription: 'Multi-omic integration has been hampered by extreme feature dimensionality and non-linear biological network dependencies. We propose SpatioGraph-CRC, an end-to-end framework leveraging hierarchical graph pooling and GNNExplainer attribution. We benchmarked SpatioGraph-CRC against Random Forests, XGBoost, and standard Multi-Layer Perceptrons on TCGA-COAD (n=458) and validated externally on GSE39582 (n=566). The model achieved an Area Under the ROC Curve (AUC) of 0.932 ± 0.014 on primary subtype differentiation.',
    methodology: 'RNA-seq counts normalized with DESeq2. Protein-protein interactions filtered for confidence score >0.700. Graph Convolutional Network layers implemented with PyTorch Geometric using 4 graph attention heads and dropout rate of 0.25. Five-fold cross-validation with stratified patient splits. GNNExplainer utilized to extract top 20 influential subgraph motifs.',
    studyPopulationSample: 'TCGA-COAD discovery cohort (n=458 patients) and independent GEO validation cohort GSE39582 (n=566 patients).',
    variables: 'Independent: Multi-omic gene expression features and graph edge topologies; Dependent: Consensus molecular subtype (CMS 1-4) and 5-year disease-free survival; Control: Baseline demographic and non-graph statistical classifiers.',
    majorFindings: '1. SpatioGraph-CRC attained 0.932 AUC for CMS subtype classification, outperforming standard XGBoost (0.814) and SVM (0.782).\n2. GNNExplainer identified a previously underappreciated 7-gene subnetwork centered on CXCL13-CXCR5 axis strongly correlated with CD8+ T-cell infiltration.\n3. Stratification of CMS4 high-risk patients demonstrated a statistically significant difference in 5-year overall survival (Hazard Ratio = 2.41, 95% CI: 1.62-3.58, p < 0.001).',
    conclusion: 'SpatioGraph-CRC demonstrates how graph-structured biological priors enhance interpretability and diagnostic precision in multi-omic cancer subtyping, bridging the gap between deep learning and clinical biomarker discovery.',
    limitations: 'Retrospective cohort analysis; spatial transcriptomic validation was limited to 12 tissue sections, necessitating prospective multi-center trial verification.',
    keywords: ['Graph Neural Networks', 'Multi-Omics Integration', 'Colorectal Cancer', 'Spatial Transcriptomics', 'Explainable AI', 'Bioinformatics'],
    documentTypeId: 'research_article' as const,
    formatId: 'fmt-ieee-trans',
    status: 'generated' as const
  }
];
