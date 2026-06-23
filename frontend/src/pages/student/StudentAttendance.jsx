import { CalendarCheck } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentAttendance() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api
      .get("/attendance/me")
      .then((res) => setRecords(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRecords([]));
  }, []);

  const getStatusLabel = (status) => {
    const s = String(status || "").trim().toLowerCase();

    if (s === "p" || s === "present") return "Present";
    if (s === "a" || s === "absent") return "Absent";
    if (s === "l" || s === "permission") return "Permission";

    return "-";
  };

  const getStatusClass = (status) => {
    const label = getStatusLabel(status);

    if (label === "Present") return "bg-green-100 text-green-700";
    if (label === "Absent") return "bg-red-100 text-red-700";
    if (label === "Permission") return "bg-yellow-100 text-yellow-700";

    return "bg-slate-100 text-slate-700";
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <CalendarCheck className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-4">{r.date}</td>

                <td className="p-4">
                  <span
                    className={`rounded-xl px-4 py-2 font-bold ${getStatusClass(
                      r.status
                    )}`}
                  >
                    {getStatusLabel(r.status)}
                  </span>
                </td>
              </tr>
            ))}

            {records.length === 0 && (
              <tr>
                <td colSpan="2" className="p-6 text-center text-slate-500">
                  No attendance record
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}