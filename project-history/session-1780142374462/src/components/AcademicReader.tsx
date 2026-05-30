import React, { useState, useCallback, useMemo } from 'react';
import type { Article } from '../store'; // Using type import

interface AcademicReaderProps {
  article: Article;
}

const AcademicReader: React.FC<AcademicReaderProps> = ({ article }) => {
  const [fontSize, setFontSize] = useState(16); // Default font size
  const [lineHeight, setLineHeight] = useState(1.6); // Default line height

  const increaseFontSize = useCallback(() => setFontSize(prev => Math.min(prev + 1, 24)), []);
  const decreaseFontSize = useCallback(() => setFontSize(prev => Math.max(prev - 1, 12)), []);
  const resetFontSize = useCallback(() => setFontSize(16), []);

  const increaseLineHeight = useCallback(() => setLineHeight(prev => Math.min(prev + 0.1, 2.2)), []);
  const decreaseLineHeight = useCallback(() => setLineHeight(prev => Math.max(prev - 0.1, 1.4)), []);
  const resetLineHeight = useCallback(() => setLineHeight(1.6), []);

  const contentStyle = useMemo(() => ({
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}`,
  }), [fontSize, lineHeight]);

  if (!article) {
    return (
      <div className="text-center text-neutral-500 text-lg py-8" role="alert">
        Article not found. Please select a valid article.
      </div>
    );
  }

  return (
    <article className="bg-white p-8 rounded-lg shadow-vibrant max-w-4xl mx-auto" aria-labelledby="article-title">
      <h1 id="article-title" className="text-4xl font-serif font-bold mb-4 text-primary-800">
        {article.title}
      </h1>
      <p className="text-lg text-neutral-600 mb-2">
        <span className="font-semibold">Author:</span> {article.author}
      </p>
      <p className="text-md text-neutral-500 mb-6">
        <span className="font-semibold">Year:</span> {article.year}
      </p>

      {/* Reader Controls */}
      <div className="mb-8 p-4 bg-neutral-100 rounded-md flex flex-wrap items-center justify-center gap-4 shadow-inner" role="toolbar" aria-label="Reader settings">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-neutral-700">Font Size:</span>
          <button
            onClick={decreaseFontSize}
            className="p-2 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Decrease font size"
            title="Decrease font size"
            disabled={fontSize <= 12}
          >
            A-
          </button>
          <span className="w-8 text-center">{fontSize}px</span>
          <button
            onClick={increaseFontSize}
            className="p-2 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Increase font size"
            title="Increase font size"
            disabled={fontSize >= 24}
          >
            A+
          </button>
          <button
            onClick={resetFontSize}
            className="ml-2 p-2 rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-500 text-sm"
            aria-label="Reset font size"
            title="Reset font size"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-medium text-neutral-700">Line Height:</span>
          <button
            onClick={decreaseLineHeight}
            className="p-2 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Decrease line height"
            title="Decrease line height"
            disabled={lineHeight <= 1.4}
          >
            -
          </button>
          <span className="w-8 text-center">{lineHeight.toFixed(1)}</span>
          <button
            onClick={increaseLineHeight}
            className="p-2 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Increase line height"
            title="Increase line height"
            disabled={lineHeight >= 2.2}
          >
            +
          </button>
          <button
            onClick={resetLineHeight}
            className="ml-2 p-2 rounded-md bg-neutral-200 text-neutral-700 hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-500 text-sm"
            aria-label="Reset line height"
            title="Reset line height"
          >
            Reset
          </button>
        </div>
      </div>

      <section aria-label="Article Abstract">
        <h2 className="text-2xl font-serif font-bold mb-4 text-primary-700">Abstract</h2>
        <p className="mb-8 leading-relaxed text-neutral-700 italic" style={contentStyle}>
          {article.abstract}
        </p>
      </section>

      {/* Main Content Area - Using dangerouslySetInnerHTML for mock HTML content */}
      <section
        className="prose prose-lg max-w-none text-neutral-800" // Tailwind Typography plugin can enhance this
        style={contentStyle}
        dangerouslySetInnerHTML={{ __html: article.content }}
        aria-label="Full article content"
      />
    </article>
  );
};

export default AcademicReader;