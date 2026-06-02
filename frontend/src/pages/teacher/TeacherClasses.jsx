import { Eye, Users } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get("/classes/teacher/my-classes")
      .then((res) => setClasses(res.data))
      .catch(() => setClasses([]));
  }, []);

  const viewClass = async (id) => {
    const res = await api.get(`/classes/${id}`);
    setDetail(res.data);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Users className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">My Classes</h1>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Class</th>
              <th className="p-4 text-left">Section</th>
              <th className="p-4 text-left">Students</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-4">{c.name}</td>
                <td className="p-4">{c.section}</td>
                <td className="p-4">{c.students_count}</td>
                <td className="p-4 text-right">
                  <button onClick={() => viewClass(c.id)} className="rounded-lg border px-3 py-2 text-blue-600">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">
            Students in {detail.name} {detail.section}
          </h2>

          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Gender</th>
                <th className="p-3 text-left">Guardian</th>
                <th className="p-3 text-left">Phone</th>
              </tr>
            </thead>
            <tbody>
              {detail.students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.name || "-"}</td>
                  <td className="p-3">{s.email || "-"}</td>
                  <td className="p-3">{s.gender || "-"}</td>
                  <td className="p-3">{s.guardian_name || "-"}</td>
                  <td className="p-3">{s.guardian_phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}