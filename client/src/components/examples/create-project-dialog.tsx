import { CreateProjectDialog } from '../create-project-dialog';

export default function CreateProjectDialogExample() {
  return (
    <div className="p-6">
      <CreateProjectDialog
        onCreateProject={(data) => console.log('Project created:', data)}
      />
    </div>
  );
}
