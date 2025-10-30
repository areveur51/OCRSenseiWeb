import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate?: (href: string) => void;
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm" data-testid="breadcrumb-nav">
      <button
        onClick={() => onNavigate?.("/")}
        className="text-muted-foreground hover:text-foreground transition-colors"
        data-testid="breadcrumb-home"
      >
        <Home className="h-4 w-4" />
      </button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {item.href && index < items.length - 1 ? (
            <button
              onClick={() => onNavigate?.(item.href!)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`breadcrumb-${item.label.toLowerCase()}`}
            >
              {item.label}
            </button>
          ) : (
            <span
              className="font-medium text-foreground"
              data-testid={`breadcrumb-${item.label.toLowerCase()}`}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
