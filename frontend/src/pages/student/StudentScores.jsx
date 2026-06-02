import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentScores() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    api
      .get("/scores/student/me")
      .then((res) => setScores(res.data))
      .catch(() => setScores([]));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <FileText className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">My Scores</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Subject</th>
              <th className="p-4 text-left">Teacher</th>
              <th className="p-4 text-left">Exam</th>
              <th className="p-4 text-left">Score</th>
              <th className="p-4 text-left">Remark</th>
            </tr>
          </thead>

          <tbody>
            {scores.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-4">{s.subject_name}</td>
                <td className="p-4">{s.teacher_name}</td>
                <td className="p-4">{s.exam_type}</td>
                <td className="p-4 font-bold text-red-600">
                  {s.score}
                </td>
                <td className="p-4">{s.remark || "-"}</td>
              </tr>
            ))}

            {scores.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  No scores yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}