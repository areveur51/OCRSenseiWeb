import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, FolderOpen, X, Plus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Image, OcrResult, MonitoredSearch } from "@shared/schema";

interface SearchResult {
  image: Image;
  ocrResult: OcrResult;
}

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { toast } = useToast();

  const { data: results, isLoading } = useQuery<SearchResult[]>({
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

  const { data: monitoredSearches = [] } = useQuery<Array<MonitoredSearch & { resultCount: number }>>({
    queryKey: ["/api/monitored-searches"],
  });

  const addMonitoredSearch = useMutation({
    mutationFn: async (searchTerm: string) => {
      await apiRequest("POST", "/api/monitored-searches", { searchTerm });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitored-searches"] });
      toast({
        title: "Search term added",
        description: "This search term is now being monitored",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add monitored search",
        variant: "destructive",
      });
    },
  });

  const deleteMonitoredSearch = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/monitored-searches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitored-searches"] });
      toast({
        title: "Search term removed",
        description: "This search term is no longer being monitored",
      });
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => setDebouncedQuery(query), 500);
  };

  const handleMonitoredSearchClick = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    setDebouncedQuery(searchTerm);
  };

  const isCurrentSearchMonitored = monitoredSearches.some(
    (ms) => ms.searchTerm.toLowerCase() === debouncedQuery.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-8">
        <pre className="ascii-art text-xl hidden md:block">
{`╭───────────────╮
│      ?        │
│ ───────────── │
│ ═══════════── │
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

      {monitoredSearches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Monitored Search Terms
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {monitoredSearches.map((search) => (
              <Card
                key={search.id}
                className="px-3 py-2 hover-elevate active-elevate-2 cursor-pointer inline-flex items-center gap-2"
                onClick={() => handleMonitoredSearchClick(search.searchTerm)}
                data-testid={`monitored-search-${search.id}`}
              >
                <span className="text-sm font-medium">{search.searchTerm}</span>
                <Badge variant="secondary" className="text-xs">
                  {search.resultCount}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMonitoredSearch.mutate(search.id);
                  }}
                  data-testid={`delete-monitored-search-${search.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

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
        ) : isLoading || debouncedQuery !== searchQuery ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-sm text-primary inline-block animate-pulse">
{`╔══════════════════╗
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓  ║
║  ▒▒▒▒▒▒▒▒▒▒▒▒▒  ║
║  ░░░░░░░░░░░░░  ║
║                  ║
║   SEARCHING...   ║
║                  ║
║  [████████████]  ║
╚══════════════════╝`}
            </pre>
            <p className="text-muted-foreground">
              Scanning database for "{searchQuery}"_
            </p>
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
              {!isCurrentSearchMonitored && debouncedQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addMonitoredSearch.mutate(debouncedQuery)}
                  disabled={addMonitoredSearch.isPending}
                  data-testid="button-add-monitored-search"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Monitor this search
                </Button>
              )}
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
