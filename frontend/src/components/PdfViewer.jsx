import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfViewer({ file }) {
    const [numPages, setNumPages] = useState(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    return (
        <div>
            <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) =>
                    console.error("Error while loading PDF:", error)
                }
                loading="Loading PDF document..."
            >
                {Array.from(new Array(numPages), (el, index) => (
                    <div key={`page_${index + 1}`} className="mb-2 flex justify-center">
                        <Page
                            pageNumber={index + 1}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            width={Math.min(window.innerWidth * 0.9, 800)}
                            onRenderError={(error) =>
                                console.error("Error while rendering page:", error)
                            }
                            loading={`Loading page ${index + 1}...`}
                        />
                    </div>
                ))}
            </Document>
        </div>
    );
}