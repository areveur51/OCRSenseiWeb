import { ImageCard } from '../image-card';

export default function ImageCardExample() {
  return (
    <div className="p-6 grid grid-cols-2 gap-4 max-w-2xl">
      <ImageCard
        filename="document_001.jpg"
        status="completed"
        confidence={94}
        onClick={() => console.log('Image clicked')}
      />
      <ImageCard
        filename="scan_legacy_042.png"
        status="processing"
        onClick={() => console.log('Image clicked')}
      />
    </div>
  );
}
