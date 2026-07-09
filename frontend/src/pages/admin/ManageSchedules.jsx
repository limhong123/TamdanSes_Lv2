import { CalendarDays, Pencil, Trash2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    day: "",
    start_time: "",
    end_time: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [scheduleRes, classRes, relationRes] = await Promise.all([
        api.get("/schedules/"),
        api.get("/classes/"),
        api.get("/class-teachers/"),
      ]);

      setSchedules(scheduleRes.data || []);
      setClasses(classRes.data || []);
      setRelations(relationRes.data || []);
    } catch (error) {
      setSchedules([]);
      setClasses([]);
      setRelations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSubjectsByClass = () => {
    if (!form.class_id) return [];

    const filtered = relations.filter(
      (r) => Number(r.class_id) === Number(form.class_id)
    );

    const unique = [];

    filtered.forEach((r) => {
      if (!unique.find((s) => Number(s.value) === Number(r.subject_id))) {
        unique.push({
          value: r.subject_id,
          label: r.subject_name,
        });
      }
    });

    return unique;
  };

  const getTeachersByClassAndSubject = () => {
    if (!form.class_id || !form.subject_id) return [];

    return relations
      .filter(
        (r) =>
          Number(r.class_id) === Number(form.class_id) &&
          Number(r.subject_id) === Number(form.subject_id)
      )
      .map((r) => ({
        value: r.teacher_id,
        label: r.teacher_name,
      }));
  };

  const groupedSchedules = schedules.reduce((acc, item) => {
    const className = item.class_name || "Unknown Class";

    if (!acc[className]) acc[className] = [];
    acc[className].push(item);

    return acc;
  }, {});

  const resetForm = () => {
    setForm({
      class_id: "",
      subject_id: "",
      teacher_id: "",
      day: "",
      start_time: "",
      end_time: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "class_id") {
        updated.subject_id = "";
        updated.teacher_id = "";
      }

      if (name === "subject_id") {
        updated.teacher_id = "";
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await api.put(`/schedules/${editingId}`, form);
      } else {
        await api.post("/schedules/", form);
      }

      await fetchData();
      resetForm();
    } catch (error) {
      alert("Failed to save schedule.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);

    setForm({
      class_id: item.class_id || "",
      subject_id: item.subject_id || "",
      teacher_id: item.teacher_id || "",
      day: item.day || "",
      start_time: item.start_time || "",
      end_time: item.end_time || "",
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this schedule?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/schedules/${id}`);
      await fetchData();
    } catch (error) {
      alert("Failed to delete schedule.");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <CalendarDays size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Manage Schedules
            </h1>
            <p className="text-sm text-slate-500">
              Showing {schedules.length} record{schedules.length !== 1 && "s"}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-800">
            {editingId ? "Edit Schedule" : "Add Schedule"}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Class
              </label>
              <select
                name="class_id"
                value={form.class_id}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section || ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Subject
              </label>
              <select
                name="subject_id"
                value={form.subject_id}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Select subject</option>
                {getSubjectsByClass().map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Teacher
              </label>
              <select
                name="teacher_id"
                value={form.teacher_id}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Select teacher</option>
                {getTeachersByClassAndSubject().map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Day
              </label>
              <select
                name="day"
                value={form.day}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Select day</option>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Start Time
              </label>
              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">
                End Time
              </label>
              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 md:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingId ? "Update Schedule" : "Save Schedule"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          No schedules found.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).map(([className, items]) => (
            <div
              key={className}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Class {className}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {items.length} schedule{items.length !== 1 && "s"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white text-left text-slate-500">
                      <th className="px-6 py-4 font-semibold">Subject</th>
                      <th className="px-6 py-4 font-semibold">Teacher</th>
                      <th className="px-6 py-4 font-semibold">Day</th>
                      <th className="px-6 py-4 font-semibold">Start</th>
                      <th className="px-6 py-4 font-semibold">End</th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {item.subject_name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.teacher_name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.day}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.start_time}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.end_time}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg border border-red-300 p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}