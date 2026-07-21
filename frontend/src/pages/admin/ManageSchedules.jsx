import {
  CalendarDays,
  ChevronDown,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const EMPTY_FORM = {
  class_id: "",
  subject_id: "",
  teacher_id: "",
  day: "",
  start_time: "",
  end_time: "",
};

export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [relations, setRelations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [selectedClass, setSelectedClass] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);

      const [scheduleRes, classRes, relationRes] =
        await Promise.all([
          api.get("/schedules/"),
          api.get("/classes/"),
          api.get("/class-teachers/"),
        ]);

      setSchedules(
        Array.isArray(scheduleRes.data)
          ? scheduleRes.data
          : [],
      );

      setClasses(
        Array.isArray(classRes.data)
          ? classRes.data
          : [],
      );

      setRelations(
        Array.isArray(relationRes.data)
          ? relationRes.data
          : [],
      );
    } catch (error) {
      console.error(
        "LOAD SCHEDULE DATA ERROR:",
        error?.response?.data || error,
      );

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

    const filteredRelations = relations.filter(
      (relation) =>
        Number(relation.class_id) ===
        Number(form.class_id),
    );

    const uniqueSubjects = [];

    filteredRelations.forEach((relation) => {
      const alreadyExists = uniqueSubjects.some(
        (subject) =>
          Number(subject.value) ===
          Number(relation.subject_id),
      );

      if (!alreadyExists) {
        uniqueSubjects.push({
          value: relation.subject_id,
          label:
            relation.subject_name ||
            `Subject ${relation.subject_id}`,
        });
      }
    });

    return uniqueSubjects.sort((a, b) =>
      String(a.label).localeCompare(
        String(b.label),
      ),
    );
  };

  const getTeachersByClassAndSubject = () => {
    if (
      !form.class_id ||
      !form.subject_id
    ) {
      return [];
    }

    const uniqueTeachers = [];

    relations
      .filter(
        (relation) =>
          Number(relation.class_id) ===
            Number(form.class_id) &&
          Number(relation.subject_id) ===
            Number(form.subject_id),
      )
      .forEach((relation) => {
        const alreadyExists = uniqueTeachers.some(
          (teacher) =>
            Number(teacher.value) ===
            Number(relation.teacher_id),
        );

        if (!alreadyExists) {
          uniqueTeachers.push({
            value: relation.teacher_id,
            label:
              relation.teacher_name ||
              `Teacher ${relation.teacher_id}`,
          });
        }
      });

    return uniqueTeachers.sort((a, b) =>
      String(a.label).localeCompare(
        String(b.label),
      ),
    );
  };

  const filteredSchedules = useMemo(() => {
    if (selectedClass === "all") {
      return schedules;
    }

    return schedules.filter(
      (item) =>
        String(item.class_id) ===
        String(selectedClass),
    );
  }, [schedules, selectedClass]);

  const groupedSchedules = useMemo(() => {
    return filteredSchedules.reduce(
      (groups, item) => {
        const classId =
          item.class_id || "unknown";

        const className =
          item.class_name ||
          `Class ${classId}`;

        const groupKey = `${classId}-${className}`;

        if (!groups[groupKey]) {
          groups[groupKey] = {
            className,
            items: [],
          };
        }

        groups[groupKey].items.push(item);

        return groups;
      },
      {},
    );
  }, [filteredSchedules]);

  const sortedGroups = useMemo(() => {
    return Object.values(groupedSchedules).sort(
      (a, b) =>
        String(a.className).localeCompare(
          String(b.className),
        ),
    );
  }, [groupedSchedules]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => {
      const updatedForm = {
        ...previousForm,
        [name]: value,
      };

      if (name === "class_id") {
        updatedForm.subject_id = "";
        updatedForm.teacher_id = "";
      }

      if (name === "subject_id") {
        updatedForm.teacher_id = "";
      }

      return updatedForm;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.class_id ||
      !form.subject_id ||
      !form.teacher_id ||
      !form.day ||
      !form.start_time ||
      !form.end_time
    ) {
      alert("Please complete all fields.");
      return;
    }

    if (
      form.start_time >= form.end_time
    ) {
      alert(
        "End time must be later than start time.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        class_id: Number(form.class_id),
        subject_id: Number(
          form.subject_id,
        ),
        teacher_id: Number(
          form.teacher_id,
        ),
        day: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
      };

      if (editingId) {
        await api.put(
          `/schedules/${editingId}`,
          payload,
        );
      } else {
        await api.post(
          "/schedules/",
          payload,
        );
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error(
        "SAVE SCHEDULE ERROR:",
        error?.response?.data || error,
      );

      const detail =
        error?.response?.data?.detail;

      alert(
        typeof detail === "string"
          ? detail
          : "Failed to save schedule.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);

    setForm({
      class_id:
        item.class_id !== undefined &&
        item.class_id !== null
          ? String(item.class_id)
          : "",

      subject_id:
        item.subject_id !== undefined &&
        item.subject_id !== null
          ? String(item.subject_id)
          : "",

      teacher_id:
        item.teacher_id !== undefined &&
        item.teacher_id !== null
          ? String(item.teacher_id)
          : "",

      day: item.day || "",

      start_time: formatTimeForInput(
        item.start_time,
      ),

      end_time: formatTimeForInput(
        item.end_time,
      ),
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this schedule?",
      );

    if (!confirmDelete) return;

    try {
      await api.delete(
        `/schedules/${id}`,
      );

      await fetchData();
    } catch (error) {
      console.error(
        "DELETE SCHEDULE ERROR:",
        error?.response?.data || error,
      );

      const detail =
        error?.response?.data?.detail;

      alert(
        typeof detail === "string"
          ? detail
          : "Failed to delete schedule.",
      );
    }
  };

  const selectedClassName =
    selectedClass === "all"
      ? "All Classes"
      : classes.find(
          (item) =>
            String(item.id) ===
            String(selectedClass),
        )
        ? getClassName(
            classes.find(
              (item) =>
                String(item.id) ===
                String(selectedClass),
            ),
          )
        : "Selected Class";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <CalendarDays size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Manage Schedules
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Showing{" "}
              {filteredSchedules.length}{" "}
              record
              {filteredSchedules.length !== 1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Filter size={21} />
            </div>

            <div>
              <h2 className="font-bold text-slate-800">
                Filter by Class
              </h2>

              <p className="text-sm text-slate-500">
                Currently showing:{" "}
                <span className="font-bold text-blue-600">
                  {selectedClassName}
                </span>
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <select
              value={selectedClass}
              onChange={(event) =>
                setSelectedClass(
                  event.target.value,
                )
              }
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">
                All Classes
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {getClassName(item)}
                </option>
              ))}
            </select>

            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </section>

      {showForm && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {editingId
                  ? "Edit Schedule"
                  : "Add Schedule"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Complete all schedule
                information below.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <FormSelect
              label="Class"
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
              required
            >
              <option value="">
                Select class
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {getClassName(item)}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              label="Subject"
              name="subject_id"
              value={form.subject_id}
              onChange={handleChange}
              required
              disabled={!form.class_id}
            >
              <option value="">
                {form.class_id
                  ? "Select subject"
                  : "Select class first"}
              </option>

              {getSubjectsByClass().map(
                (subject) => (
                  <option
                    key={subject.value}
                    value={subject.value}
                  >
                    {subject.label}
                  </option>
                ),
              )}
            </FormSelect>

            <FormSelect
              label="Teacher"
              name="teacher_id"
              value={form.teacher_id}
              onChange={handleChange}
              required
              disabled={
                !form.class_id ||
                !form.subject_id
              }
            >
              <option value="">
                {form.subject_id
                  ? "Select teacher"
                  : "Select subject first"}
              </option>

              {getTeachersByClassAndSubject().map(
                (teacher) => (
                  <option
                    key={teacher.value}
                    value={teacher.value}
                  >
                    {teacher.label}
                  </option>
                ),
              )}
            </FormSelect>

            <FormSelect
              label="Day"
              name="day"
              value={form.day}
              onChange={handleChange}
              required
            >
              <option value="">
                Select day
              </option>

              {DAYS.map((day) => (
                <option
                  key={day}
                  value={day}
                >
                  {day}
                </option>
              ))}
            </FormSelect>

            <FormInput
              label="Start Time"
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
            />

            <FormInput
              label="End Time"
              type="time"
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              required
            />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                )}

                {editingId
                  ? "Update Schedule"
                  : "Save Schedule"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <LoaderCircle
              size={34}
              className="animate-spin text-blue-600"
            />

            <p className="font-medium text-slate-500">
              Loading schedules...
            </p>
          </div>
        </div>
      ) : filteredSchedules.length ===
        0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <CalendarDays size={30} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-700">
            No schedules found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No schedule exists for the
            selected class.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(
            ({ className, items }) => (
              <ScheduleGroup
                key={className}
                className={className}
                items={sortSchedules(items)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleGroup({
  className,
  items,
  onEdit,
  onDelete,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 md:px-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Class {className}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {items.length} schedule
            {items.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
          {items.length} periods
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="bg-white text-left text-slate-500">
              <th className="px-6 py-4 font-semibold">
                Subject
              </th>

              <th className="px-6 py-4 font-semibold">
                Teacher
              </th>

              <th className="px-6 py-4 font-semibold">
                Day
              </th>

              <th className="px-6 py-4 font-semibold">
                Start
              </th>

              <th className="px-6 py-4 font-semibold">
                End
              </th>

              <th className="px-6 py-4 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 transition hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-bold text-slate-800">
                  {item.subject_name ||
                    `Subject ${
                      item.subject_id || ""
                    }`}
                </td>

                <td className="px-6 py-4 text-slate-600">
                  {item.teacher_name ||
                    `Teacher ${
                      item.teacher_id || ""
                    }`}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                    {item.day || "-"}
                  </span>
                </td>

                <td className="px-6 py-4 font-medium text-slate-600">
                  {formatTime(
                    item.start_time,
                  )}
                </td>

                <td className="px-6 py-4 font-medium text-slate-600">
                  {formatTime(
                    item.end_time,
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      title="Edit schedule"
                      onClick={() =>
                        onEdit(item)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      title="Delete schedule"
                      onClick={() =>
                        onDelete(item.id)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-300 text-red-500 transition hover:bg-red-50"
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
    </section>
  );
}

function FormSelect({
  label,
  children,
  disabled = false,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </label>

      <div className="relative">
        <select
          {...props}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {children}
        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function FormInput({
  label,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </label>

      <input
        {...props}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function getClassName(item) {
  if (!item) return "Unknown Class";

  const name =
    item.name ||
    item.class_name ||
    `Class ${item.id}`;

  const section =
    item.section || "";

  return `${name}${
    section ? ` ${section}` : ""
  }`;
}

function sortSchedules(items) {
  const dayOrder = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };

  return [...items].sort((a, b) => {
    const firstDay =
      dayOrder[a.day] || 99;

    const secondDay =
      dayOrder[b.day] || 99;

    if (firstDay !== secondDay) {
      return firstDay - secondDay;
    }

    return String(
      a.start_time || "",
    ).localeCompare(
      String(b.start_time || ""),
    );
  });
}

function formatTime(value) {
  if (!value) return "-";

  const parts =
    String(value).split(":");

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return String(value);
}

function formatTimeForInput(value) {
  if (!value) return "";

  const parts =
    String(value).split(":");

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return String(value);
}