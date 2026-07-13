import {
  BookOpen,
  Eye,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

export default function TeacherHomework() {
  const [homework, setHomework] = useState([]);
  const [relations, setRelations] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [bonusInputs, setBonusInputs] = useState({});

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
    due_date: "",
    file: null,
  });

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const parseFiles = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const openFile = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const loadData = async () => {
    try {
      const [homeworkRes, relationRes] = await Promise.all([
        api.get(`/homework/teacher/${teacherId}`),
        api.get("/class-teachers/"),
      ]);

      setHomework(Array.isArray(homeworkRes.data) ? homeworkRes.data : []);

      const myRelations = Array.isArray(relationRes.data)
        ? relationRes.data.filter(
            (r) => Number(r.teacher_id) === Number(teacherId)
          )
        : [];

      setRelations(myRelations);
    } catch (err) {
      console.log("LOAD HOMEWORK ERROR:", err?.response?.data || err);
      setHomework([]);
      setRelations([]);
    }
  };

  useEffect(() => {
    if (teacherId) loadData();
  }, [teacherId]);

  const visibleHomework = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return homework.filter((h) => {
      if (!h.created_at) return true;
      return new Date(h.created_at) >= oneDayAgo;
    });
  }, [homework]);

  const classOptions = [];

  relations.forEach((r) => {
    const exists = classOptions.find(
      (c) => Number(c.value) === Number(r.class_id)
    );

    if (!exists) {
      classOptions.push({
        value: r.class_id,
        label: `${r.class_name || ""} ${r.class_section || ""}`.trim(),
      });
    }
  });

  const subjectOptions = relations
    .filter((r) => Number(r.class_id) === Number(form.class_id))
    .map((r) => ({
      value: r.subject_id,
      label: r.subject_name,
    }));

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      description: "",
      class_id: "",
      subject_id: "",
      due_date: "",
      file: null,
    });
  };

  const submitHomework = async (e) => {
    e.preventDefault();

    if (!teacherId) {
      alert("teacher_id not found. Please logout and login again.");
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("class_id", form.class_id);
    data.append("subject_id", form.subject_id);
    data.append("teacher_id", teacherId);
    data.append("due_date", form.due_date);

    if (form.file) {
      data.append("file", form.file);
    }

    try {
      if (form.id) {
        await api.put(`/homework/${form.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Homework updated successfully");
      } else {
        await api.post("/homework/", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Homework created successfully");
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.log("HOMEWORK SAVE ERROR:", err?.response?.data || err);
      alert(err?.response?.data?.detail || "Save homework failed");
    }
  };

  const editHomework = (hw) => {
    setForm({
      id: hw.id,
      title: hw.title || "",
      description: hw.description || "",
      class_id: hw.class_id || "",
      subject_id: hw.subject_id || "",
      due_date: hw.due_date || "",
      file: null,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHomework = async (id) => {
    if (!confirm("Delete this homework?")) return;

    try {
      await api.delete(`/homework/${id}`);
      await loadData();
      alert("Homework deleted successfully");
    } catch (err) {
      alert(err?.response?.data?.detail || "Delete homework failed");
    }
  };

  const viewSubmissions = async (hw) => {
    try {
      const res = await api.get(`/submissions/homework/${hw.id}`);
      const list = Array.isArray(res.data) ? res.data : [];

      setSelectedHomework(hw);
      setSubmissions(list);

      const bonuses = {};
      list.forEach((s) => {
        bonuses[s.id] = s.bonus || 0;
      });
      setBonusInputs(bonuses);
    } catch (err) {
      console.log("LOAD SUBMISSIONS ERROR:", err?.response?.data || err);
      setSelectedHomework(hw);
      setSubmissions([]);
    }
  };

  const reviewSubmission = async (submissionId) => {
    try {
      const bonus = Number(bonusInputs[submissionId] || 0);

      await api.put(`/submissions/${submissionId}/review`, {
        status: "checked",
        score: bonus,
        bonus: bonus,
        teacher_comment: "Checked by teacher",
      });

      await viewSubmissions(selectedHomework);
    } catch (err) {
      console.log(err?.response?.data);
      alert(err?.response?.data?.detail || "Review failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="text-blue-600" />

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Teacher Homework
          </h1>
          <p className="text-sm text-slate-500">
            Create, update, delete homework, and review submissions
          </p>
        </div>
      </div>

      {!teacherId && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-600">
          teacher_id not found. Please logout and login again.
        </div>
      )}

      <form
        onSubmit={submitHomework}
        className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {form.id ? "Update Homework" : "Create Homework"}
          </h2>

          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-4 py-2 text-slate-600 hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            placeholder="Homework Title"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
            required
          />

          <input
            type="date"
            value={form.due_date}
            onChange={(e) =>
              setForm({
                ...form,
                due_date: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
            required
          />

          <select
            value={form.class_id}
            onChange={(e) =>
              setForm({
                ...form,
                class_id: e.target.value,
                subject_id: "",
              })
            }
            className="rounded-xl border px-4 py-3"
            required
          >
            <option value="">Select Class</option>

            {classOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
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
            disabled={!form.class_id}
          >
            <option value="">
              {form.class_id
                ? "Select Subject"
                : "Select Subject (select class first)"}
            </option>

            {subjectOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          placeholder="Homework description"
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
          className="mt-4 w-full rounded-xl border px-4 py-3"
          rows="4"
        />

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-slate-600">
          <Upload size={18} />
          <span>{form.file ? form.file.name : "Upload homework file"}</span>

          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*,.doc,.docx,.zip,.rar"
            onChange={(e) =>
              setForm({
                ...form,
                file: e.target.files[0],
              })
            }
          />
        </label>

        <button className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
          {form.id ? "Update Homework" : "Create Homework"}
        </button>
      </form>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Homework List</h2>
        <p className="text-sm text-slate-500">
          Showing homework created in the last 24 hours
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {visibleHomework.map((hw) => (
          <div key={hw.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{hw.title}</h3>

              <div className="flex gap-2">
                <button
                  onClick={() => editHomework(hw)}
                  className="flex items-center gap-2 rounded-xl border border-yellow-400 px-4 py-2 text-yellow-600 hover:bg-yellow-50"
                >
                  <Pencil size={16} />
                  Edit
                </button>

                <button
                  onClick={() => deleteHomework(hw.id)}
                  className="flex items-center gap-2 rounded-xl border border-red-400 px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {hw.class_name} • {hw.subject_name}
            </p>

            <p className="mt-3 text-slate-700">
              {hw.description || "No description"}
            </p>

            <p className="mt-3 text-sm font-semibold text-red-600">
              Due: {hw.due_date}
            </p>

            {hw.file_path && (
              <button
                type="button"
                onClick={() => openFile(hw.file_path)}
                className="mt-3 block text-blue-600 hover:underline"
              >
                View Attachment
              </button>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => viewSubmissions(hw)}
                className="flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-blue-600 hover:bg-blue-50"
              >
                <Eye size={16} />
                View Submissions
              </button>
            </div>
          </div>
        ))}

        {visibleHomework.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500 md:col-span-2">
            No recent homework in the last 24 hours
          </div>
        )}
      </div>

      {selectedHomework && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Submissions
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedHomework.title}
                </p>
              </div>

              <button onClick={() => setSelectedHomework(null)}>
                <X />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Student</th>
                    <th className="p-3 text-left">Answer</th>
                    <th className="p-3 text-left">File</th>
                    <th className="p-3 text-left">Bonus</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {submissions.map((s) => {
                    const uploadedFiles = parseFiles(s.file_paths);

                    return (
                      <tr key={s.id} className="border-t">
                        <td className="p-3">{s.student_name || "-"}</td>

                        <td className="p-3">{s.answer_text || "-"}</td>

                        <td className="p-3">
                          {uploadedFiles.length > 0 ? (
                            <div className="space-y-1">
                              {uploadedFiles.map((fileUrl, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => openFile(fileUrl)}
                                  className="block text-blue-600 hover:underline"
                                >
                                  View file {index + 1}
                                </button>
                              ))}
                            </div>
                          ) : s.file_path ? (
                            <button
                              type="button"
                              onClick={() => openFile(s.file_path)}
                              className="text-blue-600 hover:underline"
                            >
                              View file
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            value={bonusInputs[s.id] ?? ""}
                            onChange={(e) =>
                              setBonusInputs({
                                ...bonusInputs,
                                [s.id]: e.target.value,
                              })
                            }
                            disabled={s.status === "checked"}
                            className="w-24 rounded-xl border px-3 py-2"
                            placeholder="0"
                          />
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              s.status === "checked"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => reviewSubmission(s.id)}
                            disabled={s.status === "checked"}
                            className={`rounded-lg px-3 py-2 text-white ${
                              s.status === "checked"
                                ? "cursor-not-allowed bg-slate-400"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {s.status === "checked" ? "Checked" : "Check"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-500">
                        No submissions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}