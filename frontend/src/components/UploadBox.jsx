import { Upload } from "lucide-react";

export default function UploadBox({ onChange }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:bg-slate-50">
      <Upload className="mb-3 text-blue-600" />
      <p className="font-medium text-slate-800">Upload file</p>
      <p className="mt-1 text-sm text-slate-500">Choose a file from your computer</p>
      <input type="file" onChange={onChange} className="hidden" />
    </label>
  );
}
