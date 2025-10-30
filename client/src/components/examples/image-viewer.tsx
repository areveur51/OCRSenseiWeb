import { ImageViewer } from '../image-viewer';

export default function ImageViewerExample() {
  const mockRegions = [
    { id: '1', text: 'Sample text', x: 10, y: 10, width: 30, height: 5 },
    { id: '2', text: 'More text', x: 10, y: 20, width: 40, height: 5 },
  ];

  return (
    <div className="p-6">
      <ImageViewer
        textRegions={mockRegions}
        onRegionHover={(id) => console.log('Hovered region:', id)}
      />
    </div>
  );
}
