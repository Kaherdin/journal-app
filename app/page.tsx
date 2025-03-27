"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [pageId, setPageId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"raw" | "preview">("preview");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/convert?pageId=${encodeURIComponent(pageId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to convert Notion page");
      }

      setMarkdown(data.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Notion to Markdown Converter</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label htmlFor="pageId" className="block text-sm font-medium mb-2">
              Notion Page ID
            </label>
            <input
              type="text"
              id="pageId"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="Enter Notion page ID"
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? "Converting..." : "Convert to Markdown"}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}

        {markdown && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Generated Markdown</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('raw')}
                  className={`py-1 px-3 rounded-md ${viewMode === 'raw' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Raw
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`py-1 px-3 rounded-md ${viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Preview
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-100 rounded-md">
              {viewMode === 'raw' ? (
                <pre className="whitespace-pre-wrap">{markdown}</pre>
              ) : (
                <div className="markdown-preview prose">
                  <ReactMarkdown>{markdown}</ReactMarkdown>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => navigator.clipboard.writeText(markdown)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
