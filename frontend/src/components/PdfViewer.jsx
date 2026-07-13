import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfViewer({ file }) {
  const [numPages, setNumPages] = useState(0);

  return (
    <Document
      file={file}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      onLoadError={(error) => {
        console.log("PDF LOAD ERROR:", error);
        alert("Cannot load PDF");
      }}
      loading="Loading PDF..."
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
  );
}