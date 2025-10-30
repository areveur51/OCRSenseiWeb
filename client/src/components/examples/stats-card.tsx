import { StatsCard } from '../stats-card';
import { FolderOpen, FileText, CheckCircle2, TrendingUp } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
      <StatsCard
        title="Total Projects"
        value={12}
        icon={FolderOpen}
        trend={{ value: "2 this week", isPositive: true }}
      />
      <StatsCard
        title="Images Processed"
        value="3,247"
        icon={FileText}
        description="Last 30 days"
      />
      <StatsCard
        title="Completed"
        value="2,891"
        icon={CheckCircle2}
      />
      <StatsCard
        title="Avg. Confidence"
        value="94.2%"
        icon={TrendingUp}
        trend={{ value: "3.1% from last month", isPositive: true }}
      />
    </div>
  );
}
