import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X } from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfViewer({ file, onClose }) {
  const [numPages, setNumPages] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/60 p-4">
      <div className="h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4">
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b bg-white pb-3">
          <h2 className="text-lg font-bold text-slate-800">PDF Attachment</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X />
          </button>
        </div>

        <Document
          file={file}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(error) => {
            console.log("PDF LOAD ERROR:", error);
            alert("Cannot load PDF. Please check file URL or upload again.");
          }}
          loading={
            <div className="p-10 text-center text-slate-500">
              Loading PDF...
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, index) => (
            <div key={index} className="mb-4 flex justify-center">
              <Page
                pageNumber={index + 1}
                width={Math.min(window.innerWidth * 0.9, 800)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}