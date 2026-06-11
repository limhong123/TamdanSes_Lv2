import { Eye, Users, Mail, Phone, UserRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api
      .get("/classes/teacher/my-classes")
      .then((res) => setClasses(res.data))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const viewClass = async (id) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/classes/${id}`);
      setDetail(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/20 p-3">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Classes</h1>
            <p className="text-sm text-blue-100">
              View your assigned classes and student details
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-semibold text-slate-800">Assigned Classes</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No classes assigned yet.
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {c.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Section {c.section || "-"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {c.students_count || 0} students
                  </span>
                </div>

                <button
                  onClick={() => viewClass(c.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Eye size={16} />
                  View Students
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-6 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Loading students...
        </div>
      )}

      {detail && !detailLoading && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {detail.name} - Section {detail.section}
              </h2>
              <p className="text-sm text-slate-500">
                Student list and guardian information
              </p>
            </div>

            <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">
              {detail.students?.length || 0} students
            </span>
          </div>

          {!detail.students || detail.students.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No students found in this class.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4 text-left">Student</th>
                    <th className="p-4 text-left">Gender</th>
                    <th className="p-4 text-left">Guardian</th>
                    <th className="p-4 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.students.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <UserRound size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {s.name || "-"}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail size={12} />
                              {s.email || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-700">
                        {s.gender || "-"}
                      </td>

                      <td className="p-4 text-slate-700">
                        {s.guardian_name || "-"}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <Phone size={14} />
                          {s.guardian_phone || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}