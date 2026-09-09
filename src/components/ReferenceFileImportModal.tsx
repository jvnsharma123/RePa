import React, { useState } from 'react';
import {
  X,
  Upload,
  FileCode,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { ProjectReference, ReferenceImportBatchResult } from '../types';
import { parseBibtex } from '../services/parsers/bibtexParser';
import { parseRis } from '../services/parsers/risParser';

interface ReferenceFileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsedResult: (result: ReferenceImportBatchResult) => void;
  existingReferences: ProjectReference[];
  projectId: string;
  defaultFormat?: 'bibtex' | 'ris';
}

export const ReferenceFileImportModal: React.FC<ReferenceFileImportModalProps> = ({
  isOpen,
  onClose,
  onParsedResult,
  existingReferences,
  projectId,
  defaultFormat = 'bibtex',
}) => {
  if (!isOpen) return null;

  const [format, setFormat] = useState<'bibtex' | 'ris'>(defaultFormat);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedContent, setPastedContent] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParseError(null);
      // Auto-detect format by extension
      if (file.name.toLowerCase().endsWith('.ris')) {
        setFormat('ris');
      } else if (file.name.toLowerCase().endsWith('.bib') || file.name.toLowerCase().endsWith('.bibtex')) {
        setFormat('bibtex');
      }
    }
  };

  const handleProcess = async () => {
    setParseError(null);
    let textToParse = '';
    let fileName: string | undefined = undefined;

    if (inputMode === 'file') {
      if (!selectedFile) {
        setParseError('Please choose a file to import.');
        return;
      }
      fileName = selectedFile.name;
      try {
        textToParse = await selectedFile.text();
      } catch (err: any) {
        setParseError('Failed to read file content.');
        return;
      }
    } else {
      if (!pastedContent.trim()) {
        setParseError('Please paste your BibTeX or RIS records.');
        return;
      }
      textToParse = pastedContent;
    }

    if (!textToParse.trim()) {
      setParseError('The provided file or text is empty.');
      return;
    }

    // Run Parser
    let result: ReferenceImportBatchResult;
    if (format === 'bibtex') {
      result = parseBibtex(textToParse, projectId, existingReferences);
      result.sourceFileName = fileName;
    } else {
      result = parseRis(textToParse, projectId, existingReferences);
      result.sourceFileName = fileName;
    }

    if (result.entries.length === 0) {
      setParseError(`No valid ${format.toUpperCase()} records found in input.`);
      return;
    }

    onParsedResult(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif-academic">
                Import Reference File
              </h3>
              <p className="text-xs text-gray-500">
                Batch import from BibTeX (.bib) or EndNote / Zotero / Mendeley RIS (.ris) files.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Format & Mode Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Format:</span>
              <div className="inline-flex rounded-md shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFormat('bibtex')}
                  className={`px-3 py-1 text-xs font-semibold rounded-l-md border ${
                    format === 'bibtex'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  BibTeX (.bib)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('ris')}
                  className={`px-3 py-1 text-xs font-semibold rounded-r-md border-t border-b border-r ${
                    format === 'ris'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  RIS (.ris)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Method:</span>
              <div className="inline-flex rounded-md shadow-2xs">
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1 text-xs font-semibold rounded-l-md border ${
                    inputMode === 'file'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1 text-xs font-semibold rounded-r-md border-t border-b border-r ${
                    inputMode === 'paste'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>
          </div>

          {inputMode === 'file' ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="ref-file-input"
                accept={format === 'bibtex' ? '.bib,.bibtex,.txt' : '.ris,.txt'}
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="ref-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-8 h-8 text-blue-500" />
                <span className="text-xs font-semibold text-gray-800">
                  {selectedFile ? selectedFile.name : `Select ${format.toUpperCase()} file (.${format === 'bibtex' ? 'bib' : 'ris'})`}
                </span>
                <span className="text-[11px] text-gray-400">
                  {format === 'bibtex'
                    ? 'Exports from LaTeX, Overleaf, Google Scholar, DBLP, arXiv'
                    : 'Exports from Zotero, Mendeley, EndNote, PubMed, Scopus, Web of Science'}
                </span>
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Paste Raw {format.toUpperCase()} Records:
              </label>
              <textarea
                rows={8}
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder={
                  format === 'bibtex'
                    ? `@article{vaswani2017attention,
  title={Attention is all you need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  journal={Advances in Neural Information Processing Systems},
  volume={30},
  year={2017}
}`
                    : `TY  - JOUR
TI  - Deep Residual Learning for Image Recognition
AU  - He, Kaiming
AU  - Zhang, Xiangyu
AU  - Ren, Shaoqing
AU  - Sun, Jian
JO  - CVPR
PY  - 2016
ER  -`
                }
                className="w-full text-xs p-3 font-mono rounded-lg border border-gray-300 focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{parseError}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={inputMode === 'file' ? !selectedFile : !pastedContent.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            Parse & Review References
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
