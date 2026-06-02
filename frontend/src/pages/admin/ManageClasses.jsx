import { BookOpen, Eye, X } from "lucide-react";
import { useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageClasses() {
  const [detail, setDetail] = useState(null);

  const viewDetail = async (id) => {
    try {
      const res = await api.get(`/classes/${id}`);
      setDetail(res.data);
    } catch (err) {
      alert(err?.response?.data?.detail || "Cannot load class detail");
    }
  };

  return (
    <>
      <AdminCrudPage
        title="Manage Classes"
        endpoint="/classes/"
        icon={BookOpen}
        columns={[
          { key: "id", label: "ID" },
          {
            key: "class_display",
            label: "Class",
            render: (item) => `${item.name || ""} ${item.section || ""}`,
          },
          { key: "teachers_count", label: "Teachers" },
          { key: "students_count", label: "Students" },
        ]}
        fields={[
          { name: "name", label: "Class Name", required: true },
          { name: "section", label: "Section", required: true },
        ]}
        extraActions={(item) => (
          <button
            onClick={() => viewDetail(item.id)}
            className="rounded-lg border px-3 py-2 text-blue-600 hover:bg-blue-50"
          >
            <Eye size={16} />
          </button>
        )}
      />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Class {detail.name} {detail.section} Detail
              </h2>

              <button onClick={() => setDetail(null)}>
                <X />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card label="Class" value={`${detail.name || ""} ${detail.section || ""}`} />
              <Card label="Section" value={detail.section} />
              <Card label="Teachers" value={detail.teachers?.length || 0} />
              <Card label="Students" value={detail.students?.length || 0} />
            </div>

            <h3 className="mb-3 text-lg font-bold text-slate-800">
              Teachers
            </h3>

            <div className="mb-6 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Teacher</th>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-left">Phone</th>
                  </tr>
                </thead>

                <tbody>
                  {detail.teachers?.map((t) => (
                    <tr key={t.relation_id} className="border-t">
                      <td className="p-3">{t.teacher_name}</td>
                      <td className="p-3">{t.subject_name}</td>
                      <td className="p-3">{t.phone || "-"}</td>
                    </tr>
                  ))}

                  {(!detail.teachers || detail.teachers.length === 0) && (
                    <tr>
                      <td colSpan="3" className="p-5 text-center text-slate-500">
                        No teachers assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="mb-3 text-lg font-bold text-slate-800">
              Students
            </h3>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Gender</th>
                    <th className="p-3 text-left">Guardian</th>
                    <th className="p-3 text-left">Phone</th>
                    <th className="p-3 text-left">Address</th>
                  </tr>
                </thead>

                <tbody>
                  {detail.students?.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">{s.name}</td>
                      <td className="p-3">{s.email}</td>
                      <td className="p-3">{s.gender || "-"}</td>
                      <td className="p-3">{s.guardian_name || "-"}</td>
                      <td className="p-3">{s.guardian_phone || "-"}</td>
                      <td className="p-3">{s.address || "-"}</td>
                    </tr>
                  ))}

                  {(!detail.students || detail.students.length === 0) && (
                    <tr>
                      <td colSpan="6" className="p-5 text-center text-slate-500">
                        No students in this class
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value || "-"}</p>
    </div>
  );
}