import { ProjectCard } from '../project-card';

export default function ProjectCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <ProjectCard
        name="Historical Documents"
        totalImages={450}
        processedImages={320}
        subdirectoryCount={12}
        lastUpdated="2 hours ago"
        onClick={() => console.log('Project clicked')}
      />
    </div>
  );
}
