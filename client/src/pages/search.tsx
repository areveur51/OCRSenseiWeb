import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, FolderOpen } from "lucide-react";
import type { Image, OcrResult } from "@shared/schema";

interface SearchResult {
  image: Image;
  ocrResult: OcrResult;
}

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: results } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => setDebouncedQuery(query), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-8">
        <pre className="ascii-art text-xl hidden md:block">
{`╭───────────────╮
│      ?        │
│   ─────────────   │
│  ═══════════  │
╰───────────────╯
   [SEARCH]`}
        </pre>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="headline-highlight">TEXT SEARCH</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            &gt; Search across all extracted text from projects_
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <SearchBar
          placeholder="Search extracted text across all projects..."
          onSearch={handleSearch}
        />
      </div>

      <div className="space-y-4">
        {!searchQuery ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-sm text-muted-foreground inline-block">
{`╔════════════╗
║   READY    ║
║    🔍🔍    ║
╚════════════╝`}
            </pre>
            <p className="text-muted-foreground">
              Enter a search query to find text across all OCR-processed images
            </p>
          </div>
        ) : debouncedQuery !== searchQuery ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="ascii-art">SEARCHING...</div>
          </div>
        ) : !results || results.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-sm text-muted-foreground inline-block">
{`╔════════════╗
║    ∅∅∅∅    ║
║  NO MATCH  ║
╚════════════╝`}
            </pre>
            <p className="text-muted-foreground">
              No results found for "{searchQuery}"
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
            </div>

            <div className="space-y-4">
              {results.map((result) => {
                const confidence = result.ocrResult.pytesseractConfidence || result.ocrResult.easyocrConfidence || 0;
                const matchedText = result.ocrResult.consensusText || "";
                const queryIndex = matchedText.toLowerCase().indexOf(searchQuery.toLowerCase());
                const contextStart = Math.max(0, queryIndex - 50);
                const contextEnd = Math.min(matchedText.length, queryIndex + searchQuery.length + 50);
                const excerpt = matchedText.substring(contextStart, contextEnd);

                return (
                  <Card
                    key={result.image.id}
                    className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setLocation(`/image/${result.image.id}`)}
                    data-testid={`search-result-${result.image.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <pre className="ascii-art text-xs opacity-80">
{`┌─────┐
│ IMG │
└─────┘`}
                        </pre>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {result.image.originalFilename}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(result.image.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {confidence}% confident
                      </Badge>
                    </div>

                    <p className="text-sm bg-muted/30 p-3 rounded">
                      {contextStart > 0 && "..."}
                      {excerpt.substring(0, queryIndex - contextStart)}
                      <span className="bg-primary/30 font-semibold">
                        {excerpt.substring(queryIndex - contextStart, queryIndex - contextStart + searchQuery.length)}
                      </span>
                      {excerpt.substring(queryIndex - contextStart + searchQuery.length)}
                      {contextEnd < matchedText.length && "..."}
                    </p>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
