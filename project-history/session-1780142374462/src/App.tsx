import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useStore } from './store';

// Lazy load the AcademicReader component for performance
const AcademicReader = lazy(() => import('./components/AcademicReader'));

const App: React.FC = () => {
  const { articles, selectedArticleId, selectArticle, searchText, setSearchText } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const filteredArticles = useMemo(() => {
    if (!searchText) return articles;
    const lowercasedSearch = searchText.toLowerCase();
    return articles.filter(article =>
      article.title.toLowerCase().includes(lowercasedSearch) ||
      article.author.toLowerCase().includes(lowercasedSearch) ||
      article.abstract.toLowerCase().includes(lowercasedSearch)
    );
  }, [articles, searchText]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const selectedArticle = useMemo(() => {
    return articles.find(article => article.id === selectedArticleId);
  }, [articles, selectedArticleId]);

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-800">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-gradient-to-br from-primary-700 to-gradientEnd text-primary-50
          w-80 transition-all duration-300 ease-in-out shadow-xl overflow-hidden
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}`}
        aria-label="Library navigation and content list"
      >
        <div className="p-6 h-full flex flex-col">
          <div className={`flex items-center mb-6 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
            <h1 className="text-3xl font-bold text-accent-light">eLibrary 📚</h1>
          </div>

          <div className={`mb-6 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
            <label htmlFor="search-input" className="sr-only">Search Articles</label>
            <input
              id="search-input"
              type="text"
              placeholder="Search articles..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full p-2 rounded-lg bg-primary-600 text-primary-50 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-accent-light"
              aria-label="Search articles by title, author, or keywords"
            />
          </div>

          <nav className="flex-grow overflow-y-auto custom-scrollbar pr-2" aria-label="Article list">
            <h2 className={`text-xl font-semibold mb-4 text-accent-light transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
              {isSidebarOpen ? 'Academic Papers' : 'Papers'}
            </h2>
            <ul>
              {filteredArticles.map(article => (
                <li key={article.id} className="mb-2">
                  <button
                    onClick={() => selectArticle(article.id)}
                    className={`block w-full text-left p-3 rounded-lg
                      ${selectedArticleId === article.id
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'hover:bg-primary-600 text-primary-100'
                      }
                      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-light`}
                    aria-current={selectedArticleId === article.id ? 'page' : undefined}
                  >
                    <span className="font-medium block">{article.title}</span>
                    <span className="text-sm opacity-80">{article.author} ({article.year})</span>
                  </button>
                </li>
              ))}
            </ul>
            {filteredArticles.length === 0 && (
              <p className="text-primary-200 text-sm italic">No articles found.</p>
            )}
          </nav>

          <div className="mt-auto pt-4 border-t border-primary-600">
            <div className="flex items-center text-primary-200 text-sm">
              <span className="block">{isSidebarOpen ? 'Logged in as Guest' : 'Guest'}</span>
              <button
                className={`ml-auto p-2 rounded-full hover:bg-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-light
                  ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}
                aria-label="User profile settings"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-neutral-100 relative overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-white shadow-sm p-4 flex items-center z-10">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md text-primary-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-controls="library-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
          <h2 className="text-2xl font-semibold text-neutral-700 ml-4 md:ml-0">
            {selectedArticle ? selectedArticle.title : 'Select an Article'}
          </h2>
          <div className="ml-auto flex items-center space-x-4">
            {/* Future: User settings, notifications etc. */}
            <span className="text-neutral-500 hidden md:inline">Guest User</span>
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">G</div>
          </div>
        </header>

        {/* Article Reader Section */}
        <section className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-neutral-50">
          {selectedArticle ? (
            <Suspense fallback={
              <div className="flex justify-center items-center h-full text-lg text-primary-500">
                Loading academic content...
              </div>
            }>
              <AcademicReader article={selectedArticle} />
            </Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500">
              <p className="text-xl mb-4">✨ Welcome to your eLibrary! ✨</p>
              <p className="text-lg">Select an article from the sidebar to start reading.</p>
              <p className="mt-8 text-6xl">📚</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;