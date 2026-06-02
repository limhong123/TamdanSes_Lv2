import {
  CheckCircle,
  Link2,
  Trash2,
  XCircle,
} from "lucide-react";

import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ClassTeachers() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [relations, setRelations] = useState([]);

  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    class_id: "",
    teacher_id: "",
    subject_id: "",
  });

  const getClassLabel = (item) => {
    if (!item) return "-";

    const name =
      item.name ||
      item.class_name ||
      item.class ||
      "";

    const section =
      item.section ||
      item.class_section ||
      "";

    return `${name} ${section}`.trim() || "-";
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });

    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const loadData = async () => {
    try {
      const [
        classesRes,
        teachersRes,
        subjectsRes,
        relationsRes,
      ] = await Promise.all([
        api.get("/classes/"),
        api.get("/teachers/"),
        api.get("/subjects/"),
        api.get("/class-teachers/"),
      ]);

      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      setTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
      setRelations(Array.isArray(relationsRes.data) ? relationsRes.data : []);
    } catch (err) {
      showMessage("error", "Cannot load data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createRelation = async (e) => {
    e.preventDefault();

    try {
      await api.post("/class-teachers/", {
        class_id: Number(form.class_id),
        teacher_id: Number(form.teacher_id),
        subject_id: Number(form.subject_id),
      });

      setForm({
        class_id: "",
        teacher_id: "",
        subject_id: "",
      });

      loadData();

      showMessage("success", "Teacher assigned successfully");
    } catch (err) {
      showMessage(
        "error",
        err?.response?.data?.detail || "Assign failed"
      );
    }
  };

  const deleteRelation = async () => {
    try {
      await api.delete(`/class-teachers/${deleteId}`);

      setRelations((prev) =>
        prev.filter((item) => item.id !== deleteId)
      );

      setDeleteId(null);

      showMessage("success", "Deleted successfully");
    } catch (err) {
      showMessage(
        "error",
        err?.response?.data?.detail || "Delete failed"
      );
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-[999] flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}

          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <Link2 className="text-blue-600" />

        <h1 className="text-2xl font-bold text-slate-800">
          Class Teachers
        </h1>
      </div>

      <form
        onSubmit={createRelation}
        className="mb-6 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            value={form.class_id}
            onChange={(e) =>
              setForm({
                ...form,
                class_id: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
            required
          >
            <option value="">Select Class</option>

            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {getClassLabel(c)}
              </option>
            ))}
          </select>

          <select
            value={form.teacher_id}
            onChange={(e) =>
              setForm({
                ...form,
                teacher_id: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
            required
          >
            <option value="">Select Teacher</option>

            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.teacher_name || t.name || t.full_name || "-"}
              </option>
            ))}
          </select>

          <select
            value={form.subject_id}
            onChange={(e) =>
              setForm({
                ...form,
                subject_id: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
            required
          >
            <option value="">Select Subject</option>

            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.subject_name || "-"}
              </option>
            ))}
          </select>
        </div>

        <button className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
          Assign Teacher
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Class</th>
              <th className="p-4 text-left">Teacher</th>
              <th className="p-4 text-left">Subject</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {relations.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-4">
                  {getClassLabel(r)}
                </td>

                <td className="p-4">
                  {r.teacher_name || r.name || "-"}
                </td>

                <td className="p-4">
                  {r.subject_name || "-"}
                </td>

                <td className="p-4 text-right">
                  <button
                    onClick={() => setDeleteId(r.id)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {relations.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="p-6 text-center text-slate-500"
                >
                  No teacher assigned
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-slate-800">
              Delete Relation
            </h2>

            <p className="mb-6 text-slate-500">
              Are you sure you want to delete this relation?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={deleteRelation}
                className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}