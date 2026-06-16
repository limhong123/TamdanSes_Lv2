import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const getMonthName = (month) => {
  return months.find((m) => Number(m.value) === Number(month))?.label || "-";
};

export default function StudentScores() {
  const [scores, setScores] = useState([]);
  const [filter, setFilter] = useState({
    semester: "1",
    month: String(new Date().getMonth() + 1),
  });

  const loadScores = async () => {
    try {
      const res = await api.get("/scores/student/me", {
        params: {
          semester: filter.semester,
          month: filter.month,
        },
      });

      setScores(Array.isArray(res.data) ? res.data : []);
    } catch {
      setScores([]);
    }
  };

  useEffect(() => {
    loadScores();
  }, [filter.semester, filter.month]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-blue-600" />

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              My Scores
            </h1>

            <p className="text-sm text-slate-500">
              Scores for Semester {filter.semester} / {getMonthName(filter.month)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={filter.semester}
            onChange={(e) =>
              setFilter({
                ...filter,
                semester: e.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>

          <select
            value={filter.month}
            onChange={(e) =>
              setFilter({
                ...filter,
                month: e.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Subject</th>
              <th className="p-4 text-left">Teacher</th>
              <th className="p-4 text-left">Month</th>
              <th className="p-4 text-left">Score</th>
              <th className="p-4 text-left">Bonus</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Remark</th>
            </tr>
          </thead>

          <tbody>
            {scores.map((score) => (
              <tr key={score.id} className="border-t">
                <td className="p-4">{score.subject_name}</td>

                <td className="p-4">{score.teacher_name}</td>

                <td className="p-4">
                  Semester {score.semester || "-"} / {getMonthName(score.month)}
                </td>

                <td className="p-4 font-bold text-red-600">
                  {score.score}/{score.max_score}
                </td>

                <td className="p-4 font-bold text-blue-600">
                  +{score.bonus || 0}
                </td>

                <td className="p-4 font-bold text-green-600">
                  {score.total_score}/{score.max_score}
                </td>

                <td className="p-4">{score.remark || "-"}</td>
              </tr>
            ))}

            {scores.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">
                  No scores for Semester {filter.semester} /{" "}
                  {getMonthName(filter.month)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}