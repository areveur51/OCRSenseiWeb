import { UploadZone } from '../upload-zone';

export default function UploadZoneExample() {
  return (
    <div className="p-6 max-w-2xl">
      <UploadZone onFilesSelected={(files) => console.log('Files:', files)} />
    </div>
  );
}
