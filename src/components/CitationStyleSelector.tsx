import React from 'react';
import { SupportedCitationStyle } from '../types';
import { BookOpen, Check } from 'lucide-react';

interface CitationStyleSelectorProps {
  currentStyle: SupportedCitationStyle;
  onStyleChange: (style: SupportedCitationStyle) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const STYLES: Array<{
  key: SupportedCitationStyle;
  name: string;
  inTextExample: string;
  description: string;
}> = [
  {
    key: 'Vancouver',
    name: 'Vancouver',
    inTextExample: '(1)',
    description: 'ICMJE numeric style sequential by appearance in text'
  },
  {
    key: 'APA',
    name: 'APA (7th)',
    inTextExample: '(Smith, 2023)',
    description: 'Author-date style with alphabetical bibliography'
  },
  {
    key: 'IEEE',
    name: 'IEEE',
    inTextExample: '[1]',
    description: 'Numeric bracketed style for engineering & CS'
  }
];

export const CitationStyleSelector: React.FC<CitationStyleSelectorProps> = ({
  currentStyle,
  onStyleChange,
  className = '',
  size = 'sm'
}) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#141414]/70 flex items-center gap-1">
        <BookOpen className="w-3.5 h-3.5 text-[#141414]" />
        Style:
      </span>
      <div className="inline-flex bg-[#E4E3E0] p-0.5 border border-[#141414]">
        {STYLES.map((st) => {
          const isSelected = currentStyle === st.key;
          return (
            <button
              key={st.key}
              id={`citation-style-${st.key.toLowerCase()}-btn`}
              onClick={() => onStyleChange(st.key)}
              title={`${st.name}: ${st.description}`}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#141414] text-white shadow-xs'
                  : 'text-[#141414] hover:bg-white/60'
              } ${size === 'sm' ? 'text-[11px] py-0.5 px-2' : ''}`}
            >
              {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
              <span>{st.key}</span>
              <span
                className={`text-[9px] px-1 py-0.2 border ${
                  isSelected
                    ? 'bg-[#2A2A2A] border-gray-600 text-gray-200'
                    : 'bg-white border-[#141414]/20 text-[#666]'
                }`}
              >
                {st.inTextExample}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
