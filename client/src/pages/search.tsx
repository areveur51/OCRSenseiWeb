import { useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, FolderOpen } from "lucide-react";

interface SearchResult {
  id: string;
  filename: string;
  projectName: string;
  subdirectory: string;
  matchedText: string;
  confidence: number;
  date: string;
}

export default function Search() {
  const [results] = useState<SearchResult[]>([
    {
      id: "1",
      filename: "document_045.jpg",
      projectName: "Historical Documents",
      subdirectory: "1920s",
      matchedText:
        "...the agreement was signed on March 15, 1995 at the City Archives...",
      confidence: 94,
      date: "2024-10-28",
    },
    {
      id: "2",
      filename: "record_189.png",
      projectName: "Legal Archives",
      subdirectory: "contracts",
      matchedText: "...City Archives, Building 4, containing all relevant...",
      confidence: 89,
      date: "2024-10-27",
    },
    {
      id: "3",
      filename: "scan_0234.tiff",
      projectName: "Historical Documents",
      subdirectory: "1930s",
      matchedText: "...transferred to the City Archives for preservation...",
      confidence: 91,
      date: "2024-10-26",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex gap-8">
        <pre className="ascii-art text-xl leading-tight hidden md:block">
{`  ╭─────────╮
  │    ?    │
  │  ─────  │
  │ ═══════ │
  ╰─────────╯
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
          onSearch={(q) => console.log("Search:", q)}
          onFilterClick={() => console.log("Show filters")}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {results.length} results found
          </p>
          <Badge variant="secondary">Recent searches saved</Badge>
        </div>

        <div className="space-y-4">
          {results.map((result) => (
            <Card
              key={result.id}
              className="p-6 hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => console.log("Open result:", result.id)}
              data-testid={`result-${result.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-primary/10 mt-1">
                  <FileText className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">
                        {result.filename}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {result.projectName}
                        </span>
                        <span>•</span>
                        <span>{result.subdirectory}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {result.date}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {result.confidence}%
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.matchedText}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
