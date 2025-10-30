import { AppSidebar } from '../app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const mockProjects = [
    {
      id: 'proj1',
      name: 'Historical Docs',
      subdirectories: ['1920s', '1930s', '1940s'],
    },
    {
      id: 'proj2',
      name: 'Legal Archives',
      subdirectories: ['contracts', 'deeds'],
    },
  ];

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          projects={mockProjects}
          onNavigate={(path) => console.log('Navigate to:', path)}
        />
        <div className="flex-1 p-8 bg-background">
          <p className="text-muted-foreground">Main content area</p>
        </div>
      </div>
    </SidebarProvider>
  );
}
