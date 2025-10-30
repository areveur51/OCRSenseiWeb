import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const iconMap: Record<string, string> = {
  "Total Projects": `╔═╗
║▓║
╚═╝`,
  "Images Processed": `┌─┐
│▓│
└─┘`,
  "Completed": `[✓]
▓▓▓`,
  "Avg. Confidence": `╱▔╲
▓▓▓`,
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatsCardProps) {
  const asciiIcon = iconMap[title];
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-semibold tracking-tight font-mono" data-testid={`text-stats-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={`text-xs font-medium ${
                trend.isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {asciiIcon && (
          <pre className="ascii-art text-sm opacity-80">
{asciiIcon}
          </pre>
        )}
      </div>
    </Card>
  );
}
