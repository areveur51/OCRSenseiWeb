import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, FolderOpen, X, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Image, OcrResult, MonitoredSearch } from "@shared/schema";

interface SearchResult {
  image: Image;
  ocrResult: OcrResult;
  projectSlug: string;
  directorySlug: string;
  imageSlug: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { toast } = useToast();

  const { data: searchResponse, isLoading } = useQuery<SearchResponse>({
    queryKey: ["/api/search", debouncedQuery, currentPage, pageSize],
    queryFn: async () => {
      const offset = (currentPage - 1) * pageSize;
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}&offset=${offset}&limit=${pageSize}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const results = searchResponse?.results || [];
  const total = searchResponse?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

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
    setCurrentPage(1); // Reset to page 1 when search changes
    setTimeout(() => setDebouncedQuery(query), 500);
  };

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize));
    setCurrentPage(1); // Reset to page 1 when page size changes
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
{`╔═══════╗
║ ╔═══╗ ║
║ ║ ? ║ ║
║ ╚═══╝ ║
╚═══════╝`}
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
            <pre className="ascii-art text-base text-muted-foreground inline-block">
{`╔═══╗
║ ? ║
║   ║
╚═══╝`}
            </pre>
            <p className="text-muted-foreground">
              Enter a search query to find text across all OCR-processed images
            </p>
          </div>
        ) : isLoading || debouncedQuery !== searchQuery ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-base text-primary inline-block animate-pulse">
{`╔═══╗
║▓▒░║
║░▒▓║
╚═══╝`}
            </pre>
            <p className="text-muted-foreground">
              Scanning database for "{searchQuery}"_
            </p>
          </div>
        ) : !searchResponse || results.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <pre className="ascii-art text-base text-muted-foreground inline-block">
{`╔═══╗
║ - ║
║   ║
╚═══╝`}
            </pre>
            <p className="text-muted-foreground">
              No results found for "{searchQuery}"
            </p>
            {!isCurrentSearchMonitored && debouncedQuery && (
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addMonitoredSearch.mutate(debouncedQuery)}
                  disabled={addMonitoredSearch.isPending}
                  data-testid="button-add-monitored-search-no-results"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Monitor this search
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Track this term and see when results appear in future uploads
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Found {total} result{total !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-24" data-testid="select-search-page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>
                )}
              </div>
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
                // Use the highest confidence between Tesseract and EasyOCR
                const tesseractConf = result.ocrResult.pytesseractConfidence ?? 0;
                const easyocrConf = result.ocrResult.easyocrConfidence ?? 0;
                const confidence = Math.max(tesseractConf, easyocrConf);
                const matchedText = result.ocrResult.consensusText || "";
                
                // Find the best match position for highlighting
                const findBestMatch = (text: string, query: string): { start: number; length: number; matchedWord: string } => {
                  const lowerText = text.toLowerCase();
                  const lowerQuery = query.toLowerCase();
                  
                  // Try exact match first
                  const exactIndex = lowerText.indexOf(lowerQuery);
                  if (exactIndex !== -1) {
                    return { start: exactIndex, length: query.length, matchedWord: text.substring(exactIndex, exactIndex + query.length) };
                  }
                  
                  // For fuzzy matches, try to find each word of the query
                  const queryWords = query.split(/\s+/).filter(w => w.length > 2);
                  for (const word of queryWords) {
                    const wordIndex = lowerText.indexOf(word.toLowerCase());
                    if (wordIndex !== -1) {
                      return { start: wordIndex, length: word.length, matchedWord: text.substring(wordIndex, wordIndex + word.length) };
                    }
                  }
                  
                  // If still no match, try to find words with similar starting characters
                  const words = text.split(/\s+/);
                  for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    // Check if word starts similarly to any query word
                    for (const qWord of queryWords) {
                      if (word.toLowerCase().startsWith(qWord.toLowerCase().substring(0, Math.min(3, qWord.length)))) {
                        const wordStart = text.indexOf(word, i === 0 ? 0 : text.indexOf(words[i - 1]) + words[i - 1].length);
                        return { start: wordStart, length: word.length, matchedWord: word };
                      }
                    }
                  }
                  
                  // Fallback: show from beginning
                  return { start: 0, length: 0, matchedWord: "" };
                };
                
                const match = findBestMatch(matchedText, searchQuery);
                const contextStart = Math.max(0, match.start - 50);
                const contextEnd = Math.min(matchedText.length, match.start + match.length + 50);
                const excerpt = matchedText.substring(contextStart, contextEnd);
                const highlightStart = match.start - contextStart;
                const highlightEnd = highlightStart + match.length;

                return (
                  <Card
                    key={result.image.id}
                    className="p-6 hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setLocation(`/p/${result.projectSlug}/${result.directorySlug}/img/${result.imageSlug}`)}
                    data-testid={`search-result-${result.image.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <pre className="ascii-art text-xs opacity-80">
{`╔═══╗
║▓▓▓║
╚═══╝`}
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
                      {excerpt.substring(0, highlightStart)}
                      {match.length > 0 && (
                        <span className="bg-primary/30 font-semibold">
                          {excerpt.substring(highlightStart, highlightEnd)}
                        </span>
                      )}
                      {excerpt.substring(highlightEnd)}
                      {contextEnd < matchedText.length && "..."}
                    </p>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} of {total} results
                  {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-search-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-search-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
