import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onFilterClick?: () => void;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  onFilterClick,
  placeholder = "Search extracted text...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12"
          data-testid="input-search"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-12"
        onClick={onFilterClick}
        data-testid="button-filter"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </form>
  );
}
