import { BreadcrumbNav } from '../breadcrumb-nav';

export default function BreadcrumbNavExample() {
  return (
    <div className="p-6">
      <BreadcrumbNav
        items={[
          { label: 'Projects', href: '/projects' },
          { label: 'Historical Documents', href: '/projects/1' },
          { label: '1920s' },
        ]}
        onNavigate={(href) => console.log('Navigate to:', href)}
      />
    </div>
  );
}
