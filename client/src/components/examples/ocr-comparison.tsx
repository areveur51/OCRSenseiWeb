import { OCRComparison } from '../ocr-comparison';

export default function OCRComparisonExample() {
  return (
    <div className="p-6 max-w-4xl">
      <OCRComparison
        pytesseractResult={{
          method: "Pytesseract",
          text: "This is a sample text extracted\nfrom the scanned document.\nDate: March 15, 1995",
          confidence: 92,
        }}
        easyOcrResult={{
          method: "EasyOCR",
          text: "This is a sample text extracted\nfrom the scanned document.\nDate: March 15, 1995",
          confidence: 96,
        }}
        consensus="This is a sample text extracted\nfrom the scanned document.\nDate: March 15, 1995"
      />
    </div>
  );
}
