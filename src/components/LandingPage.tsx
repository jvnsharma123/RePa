import React, { useState } from 'react';
import {
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileText,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  UploadCloud,
  Cpu,
  FileCheck,
  Lock,
  ExternalLink,
  GraduationCap,
  Scale,
  Microscope,
  FileSpreadsheet
} from 'lucide-react';
import { DOCUMENT_TYPE_OPTIONS, FORMAT_SPECIFICATIONS } from '../data/catalog';
import { DocumentTypeOption } from '../types';

interface LandingPageProps {
  onStartProject: () => void;
  onExploreHowItWorks: () => void;
  onSelectSampleProject: (sampleId: string) => void;
  onNavigateToDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartProject,
  onExploreHowItWorks,
  onSelectSampleProject,
  onNavigateToDashboard
}) => {
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('All');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const categories = ['All', 'Journal Articles', 'Theses & Dissertations', 'Technical & Reports', 'Custom'];

  const filteredDocTypes = selectedDocCategory === 'All'
    ? DOCUMENT_TYPE_OPTIONS
    : DOCUMENT_TYPE_OPTIONS.filter((d) => d.category === selectedDocCategory);

  const faqs = [
    {
      q: 'Does RePa fabricate or invent experimental results?',
      a: 'Absolutely not. The platform operates under a strict Non-Fabrication Guarantee. It converts your user-provided research facts, experimental numbers, measurements, and uploaded files into structured academic prose. Missing variables or missing controls are explicitly flagged for human author review.'
    },
    {
      q: 'How does the platform handle journal and university formatting standards?',
      a: 'The application contains a comprehensive format specification engine that models word budgets, abstract constraints, citation syntax (APA, IEEE, Vancouver, Harvard, etc.), margin rules, and section hierarchies. Users can also configure bespoke institutional or departmental templates.'
    },
    {
      q: 'Can I upload raw experimental datasets, figures, and statistical tables?',
      a: 'Yes. The system accepts JPG, JPEG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX, CSV, and TXT files. You can categorize them as Figures, Tables, Experimental Data, Statistical Results, or Supplementary Materials.'
    },
    {
      q: 'How is intellectual property and research data kept secure?',
      a: 'Your research materials, hypotheses, and uploaded findings are treated as private intellectual property. All processing is isolated to your project environment, and API transactions execute exclusively through secure server-side routes without exposing secrets in the browser.'
    },
    {
      q: 'What is the difference between Similarity Analysis and plagiarism detection?',
      a: 'Similarity analysis measures textual overlap and stylistic concordance against scientific writing corpora. As emphasized across academic publishing, text overlap does not automatically constitute plagiarism; common methodological phrases, standard formulas, and properly cited quotations are transparently categorized.'
    },
    {
      q: 'Who remains responsible for the final submitted manuscript?',
      a: 'The human researcher/author retains sole responsibility for scientific validity, ethical compliance, interpretation of findings, and institutional submission.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Subtle academic background grid decoration */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto space-y-6">
          {/* Integrity Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-medium shadow-sm">
            <Microscope className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dedicated Academic Manuscript Preparation Platform</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif-academic font-bold tracking-tight text-white leading-tight">
            From Research Data to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-500">
              Submission-Ready Manuscript
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed font-sans-ui">
            Transform your research materials, results and ideas into structured academic manuscripts tailored to your chosen journal, university or thesis format.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              id="hero-start-project-btn"
              onClick={onStartProject}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-lg shadow-lg shadow-indigo-950/50 flex items-center gap-2 transition-all hover:translate-y-[-1px] text-sm cursor-pointer"
            >
              Start a Research Project
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-how-it-works-btn"
              onClick={onExploreHowItWorks}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold px-5 py-3.5 rounded-lg transition-colors text-sm cursor-pointer"
            >
              Explore How It Works
            </button>
          </div>

          {/* Instant Sample Project Loader for Reviewers */}
          <div className="pt-6 border-t border-slate-800/80 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Instant Sample Workspaces:
            </span>
            <div className="flex items-center gap-2">
              <button
                id="sample-hydrogel-btn"
                onClick={() => onSelectSampleProject('demo-biomed-hydrogel')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-mono"
              >
                Biomedical Hydrogel Study
              </button>
              <button
                id="sample-genomics-btn"
                onClick={() => onSelectSampleProject('demo-ai-genomics')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-mono"
              >
                AI Multi-Omics Paper
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles & Distinction Bar */}
      <section className="bg-slate-900 border-y border-slate-800 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">1. Fact Non-Fabrication</h3>
              <p className="text-xs text-slate-400 mt-1">Never generates artificial p-values, fabricated cohorts, or imaginary citations.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400">2. Literature Grounding</h3>
              <p className="text-xs text-slate-400 mt-1">Contextual framing anchored in genuine, verifiable scholarly citation standards.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400">3. Traceable Prose</h3>
              <p className="text-xs text-slate-400 mt-1">Every generated paragraph links to its user-data or literature source.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">4. Human Author Control</h3>
              <p className="text-xs text-slate-400 mt-1">AI suggestions are marked for mandatory researcher review and validation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400 mb-2">Architectural Workflow</h2>
          <h3 className="text-2xl sm:text-3xl font-serif-academic font-bold text-white">How RePa Works</h3>
          <p className="text-sm text-slate-400 mt-2 font-sans-ui">
            A rigorous 9-stage pipeline that preserves your experimental integrity while adapting to target publication standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 font-bold text-sm mb-4 font-mono">
              01
            </div>
            <h4 className="text-base font-semibold text-white mb-2">Ingest Research Facts & Files</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans-ui">
              Input research objectives, hypotheses, methodology, and upload figures, tables, raw datasets (CSV/XLSX), or reports. The system indexes facts with source attribution.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 font-bold text-sm mb-4 font-mono">
              02
            </div>
            <h4 className="text-base font-semibold text-white mb-2">Target Format & Section Synthesis</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans-ui">
              Select from 16 document types and journal/thesis templates (IEEE, Nature, Elsevier, Harvard, MIT, etc.). The engine structures sections according to word limits and citation rules.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 font-bold text-sm mb-4 font-mono">
              03
            </div>
            <h4 className="text-base font-semibold text-white mb-2">Workspace & Quality Compliance</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans-ui">
              Review and edit in a specialized academic workspace with paragraph-level provenance tagging, similarity audits, citation validation, and export formatting.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Research Documents Section */}
      <section className="py-16 px-4 sm:px-6 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400 mb-1">Broad Academic Support</h2>
              <h3 className="text-2xl font-serif-academic font-bold text-white">Supported Research Document Types</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans-ui">16 specialized document architectures with calibrated section defaults.</p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedDocCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    selectedDocCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDocTypes.map((doc) => (
              <div
                key={doc.key}
                className="bg-slate-900 border border-slate-800/90 rounded-lg p-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{doc.recommendedWordRange}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">{doc.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">{doc.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{doc.defaultSections.length} sections</span>
                  <button
                    onClick={onStartProject}
                    className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                  >
                    Select <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journal & Thesis Formatting Engine */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400 mb-2">Extensible Format Engine</h2>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-4">
              Designed for Academic Journals & University Thesis Specifications
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Our format architecture separates content drafting from typography and presentation rules. The system models word budgets, abstract limits, citation styles (APA, IEEE, Vancouver, Harvard, Chicago, MLA), heading rules, and table conventions.
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Representative presets for IEEE, Nature/Springer, Elsevier ScienceDirect, Harvard, MIT, and Universal Academic styles.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Extensible architecture prepared for official journal APIs and institutional guidelines.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Custom format builder for laboratory, departmental, and grant reporting guidelines.</span>
              </div>
            </div>
          </div>

          {/* Format preview box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Representative Format Specimen</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                Placeholder Specification
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Citation Style</span>
                <span className="font-semibold text-slate-200">IEEE Numbered [1] / APA 7th / Vancouver</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Word Budget Limits</span>
                <span className="font-semibold text-slate-200">4,000 - 8,000 words (Max: 10,000)</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Typography & Margins</span>
                <span className="font-semibold text-slate-200">Times New Roman 10pt / 1.0 in Margins</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Section Numbering</span>
                <span className="font-semibold text-slate-200">Roman Numerals (I. INTRODUCTION)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-4 italic">
              Notice: Format presets are structured placeholders for standard conventions. Always verify specific author guides before formal submission.
            </p>
          </div>
        </div>
      </section>

      {/* Quality Control & Similarity Section */}
      <section className="py-16 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quality Control */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-emerald-400">
              <FileCheck className="w-5 h-5" />
              <h4 className="text-base font-semibold text-white">Academic Quality & Consistency Checks</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Automated audit suite evaluating research fact consistency, missing sections, citation matching, figure/table references, and claim calibration.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-300">Research Fact Consistency</span>
                <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-[10px]">
                  Passed
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-300">In-Text Citation Attribution</span>
                <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-[10px]">
                  Passed
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-300">Scientific Claim Calibration</span>
                <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-[10px]">
                  Passed
                </span>
              </div>
            </div>
          </div>

          {/* Similarity & AI Content Analysis */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-indigo-400">
              <Search className="w-5 h-5" />
              <h4 className="text-base font-semibold text-white">Similarity & AI Writing Analysis</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Dedicated interfaces prepared for professional academic similarity and probabilistic writing pattern analysis with clear ethical framing.
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Similarity Index:</span>
                <span className="font-semibold text-emerald-400">6.8% (Standard Academic Overlap)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AI-Assisted Writing Marker:</span>
                <span className="font-semibold text-slate-300">Probabilistic (18% marker)</span>
              </div>
              <p className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 italic">
                "Similarity indicates text overlap and does not by itself establish plagiarism." Results are probabilistic and never promise "plagiarism-free" guarantees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-400 mb-1">Frequently Asked Questions</h2>
          <h3 className="text-2xl font-serif font-bold text-white">Academic Integrity & Usage Details</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-colors"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    activeFaq === idx ? 'rotate-90 text-indigo-400' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="font-serif font-bold text-base text-slate-200">RePa</span>
          </div>
          <p className="text-slate-400 max-w-xl mx-auto">
            A serious scientific preparation platform designed for researchers, postgraduate students, PhD scholars, and faculty.
          </p>
          <div className="flex justify-center gap-4 text-slate-400 text-xs">
            <button onClick={onStartProject} className="hover:text-white underline underline-offset-2">Create New Project</button>
            <span>•</span>
            <button onClick={onNavigateToDashboard} className="hover:text-white underline underline-offset-2">Open Dashboard</button>
            <span>•</span>
            <span className="text-slate-600">Built on Google AI Studio</span>
          </div>
          <p className="text-[11px] text-slate-600 pt-4">
            © 2026 RePa. All research rights and authorship remain strictly with the primary investigator.
          </p>
        </div>
      </footer>
    </div>
  );
};
