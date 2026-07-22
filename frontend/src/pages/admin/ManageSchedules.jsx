import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
  XCircle,
  Atom,
  Microscope,
  Calculator,
  Languages,
  FlaskConical,
  Globe,
  Landmark,
  BookMarked,
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
];

const EMPTY_FORM = {
  class_id: "",
  subject_id: "",
  teacher_id: "",
  day: "",
  start_time: "",
  end_time: "",
};
function SubjectIcon({ subject }) {
  const name = String(subject || "").toLowerCase();

  if (name.includes("math")) {
    return <Calculator size={19} />;
  }

  if (name.includes("english")) {
    return <Languages size={19} />;
  }
  if(name.includes("khmer")) {
    return <BookOpen size={19} />;
  }

  if (name.includes("physical")) {
    return <Atom size={19} />;
  }

  if (name.includes("social")) {
    return <UserRound size={19} />;
  }

  if (name.includes("earth")) {
    return <Microscope size={19} />;
  } 

  if (
    name.includes("biology") ||
    name.includes("science") ||
    name.includes("chemistry")
  ) {
    return <FlaskConical size={19} />;
  }

  if (name.includes("geography")) {
    return <Globe size={19} />;
  }

  if (name.includes("history")) {
    return <Landmark size={19} />;
  }

  return <BookMarked size={19} />;
}
export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [relations, setRelations] = useState([]);

  const [selectedClassId, setSelectedClassId] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [scheduleRes, classRes, relationRes] =
        await Promise.all([
          api.get("/schedules/"),
          api.get("/classes/"),
          api.get("/class-teachers/"),
        ]);

      const scheduleList = Array.isArray(scheduleRes.data)
        ? scheduleRes.data
        : [];

      const classList = Array.isArray(classRes.data)
        ? classRes.data
        : [];

      const relationList = Array.isArray(relationRes.data)
        ? relationRes.data
        : [];

      setSchedules(scheduleList);
      setClasses(classList);
      setRelations(relationList);

      setSelectedClassId((previousId) => {
        const stillExists = classList.some(
          (item) =>
            String(item.id) === String(previousId),
        );

        if (stillExists) {
          return previousId;
        }

        if (classList.length > 0) {
          return String(classList[0].id);
        }

        return "";
      });
    } catch (error) {
      console.error(
        "LOAD SCHEDULE DATA ERROR:",
        error?.response?.data || error,
      );

      setSchedules([]);
      setClasses([]);
      setRelations([]);

      setError(
        getErrorMessage(
          error,
          "Failed to load schedules.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) =>
          String(item.id) ===
          String(selectedClassId),
      ),
    [classes, selectedClassId],
  );

  const filteredSchedules = useMemo(() => {
    if (!selectedClassId) return [];

    return schedules.filter(
      (item) =>
        String(item.class_id) ===
        String(selectedClassId),
    );
  }, [schedules, selectedClassId]);

  const timePeriods = useMemo(() => {
    const periodMap = new Map();

    filteredSchedules.forEach((item) => {
      if (!item.start_time || !item.end_time) {
        return;
      }

      const key = `${formatTime(item.start_time)}-${formatTime(
        item.end_time,
      )}`;

      if (!periodMap.has(key)) {
        periodMap.set(key, {
          key,
          start_time: formatTime(item.start_time),
          end_time: formatTime(item.end_time),
        });
      }
    });

    return Array.from(periodMap.values()).sort(
      (a, b) =>
        timeToMinutes(a.start_time) -
        timeToMinutes(b.start_time),
    );
  }, [filteredSchedules]);

  const subjectsByClass = useMemo(() => {
    if (!form.class_id) return [];

    const subjectMap = new Map();

    relations
      .filter(
        (relation) =>
          String(relation.class_id) ===
          String(form.class_id),
      )
      .forEach((relation) => {
        const key = String(relation.subject_id);

        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            value: relation.subject_id,
            label:
              relation.subject_name ||
              `Subject ${relation.subject_id}`,
          });
        }
      });

    return Array.from(subjectMap.values()).sort(
      (a, b) =>
        String(a.label).localeCompare(
          String(b.label),
        ),
    );
  }, [relations, form.class_id]);

  const teachersByClassAndSubject = useMemo(() => {
    if (!form.class_id || !form.subject_id) {
      return [];
    }

    const teacherMap = new Map();

    relations
      .filter(
        (relation) =>
          String(relation.class_id) ===
            String(form.class_id) &&
          String(relation.subject_id) ===
            String(form.subject_id),
      )
      .forEach((relation) => {
        const key = String(relation.teacher_id);

        if (!teacherMap.has(key)) {
          teacherMap.set(key, {
            value: relation.teacher_id,
            label:
              relation.teacher_name ||
              `Teacher ${relation.teacher_id}`,
          });
        }
      });

    return Array.from(teacherMap.values()).sort(
      (a, b) =>
        String(a.label).localeCompare(
          String(b.label),
        ),
    );
  }, [
    relations,
    form.class_id,
    form.subject_id,
  ]);

  const getSchedulesByDayAndTime = (
    day,
    period,
  ) => {
    return filteredSchedules
      .filter(
        (item) =>
          normalizeText(item.day) ===
            normalizeText(day) &&
          formatTime(item.start_time) ===
            period.start_time &&
          formatTime(item.end_time) ===
            period.end_time,
      )
      .sort((a, b) =>
        String(
          a.subject_name || "",
        ).localeCompare(
          String(b.subject_name || ""),
        ),
      );
  };

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      class_id: selectedClassId || "",
    });

    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);

    setForm({
      class_id: String(item.class_id || ""),
      subject_id: String(
        item.subject_id || "",
      ),
      teacher_id: String(
        item.teacher_id || "",
      ),
      day: item.day || "",
      start_time: formatTime(item.start_time),
      end_time: formatTime(item.end_time),
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const closeForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
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
      setError("Please complete all fields.");
      return;
    }

    if (
      timeToMinutes(form.start_time) >=
      timeToMinutes(form.end_time)
    ) {
      setError(
        "End time must be later than start time.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        class_id: Number(form.class_id),
        subject_id: Number(form.subject_id),
        teacher_id: Number(form.teacher_id),
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
        await api.post("/schedules/", payload);
      }

      setSelectedClassId(
        String(form.class_id),
      );

      closeForm();
      await fetchData();
    } catch (error) {
      console.error(
        "SAVE SCHEDULE ERROR:",
        error?.response?.data || error,
      );

      setError(
        getErrorMessage(
          error,
          "Failed to save schedule.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setDeleteId(null);
    setShowDeleteModal(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(
        `/schedules/${deleteId}`,
      );

      closeDeleteModal();
      await fetchData();
    } catch (error) {
      console.error(
        "DELETE SCHEDULE ERROR:",
        error?.response?.data || error,
      );

      setError(
        getErrorMessage(
          error,
          "Failed to delete schedule.",
        ),
      );
    } finally {
      setDeleting(false);
      setDeleteId(null);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <LoaderCircle
              size={30}
              className="animate-spin"
            />
          </div>

          <div className="text-center">
            <p className="font-bold text-slate-800">
              Loading schedules
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Please wait a moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <CalendarDays size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Manage Schedules
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Create and manage class timetables
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Schedule
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap size={22} />
              </div>

              <div>
                <h2 className="font-extrabold text-slate-900">
                  Select Class
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose one class to view its weekly
                  timetable
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-80">
              <select
                value={selectedClassId}
                onChange={(event) =>
                  setSelectedClassId(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {classes.length === 0 && (
                  <option value="">
                    No classes available
                  </option>
                )}

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
          <ScheduleForm
            form={form}
            editingId={editingId}
            classes={classes}
            subjects={subjectsByClass}
            teachers={
              teachersByClassAndSubject
            }
            saving={saving}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {selectedClass
                  ? getClassName(selectedClass)
                  : "Class Schedule"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monday – Saturday •{" "}
                {filteredSchedules.length} assigned
                schedule
                {filteredSchedules.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
              <Clock3 size={17} />

              {timePeriods.length} time period
              {timePeriods.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="sticky left-0 z-30 w-44 border-b border-r border-slate-200 bg-slate-100 px-5 py-5 text-left font-extrabold">
                    Time
                  </th>

                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="min-w-[175px] border-b border-r border-slate-200 px-4 py-5 text-center font-extrabold last:border-r-0"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {timePeriods.map(
                  (period, rowIndex) => (
                    <tr
                      key={period.key}
                      className={
                        rowIndex % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/50"
                      }
                    >
                      <td className="sticky left-0 z-20 border-r border-t border-slate-200 bg-inherit px-5 py-5 align-top">
                        <div className="flex items-center gap-2 font-extrabold text-slate-700">
                          <Clock3
                            size={17}
                            className="text-blue-500"
                          />

                          <span>
                            {period.start_time} -{" "}
                            {period.end_time}
                          </span>
                        </div>
                      </td>

                      {DAYS.map((day) => {
                        const items =
                          getSchedulesByDayAndTime(
                            day,
                            period,
                          );

                        return (
                          <td
                            key={`${day}-${period.key}`}
                            className="border-r border-t border-slate-200 p-3 align-top last:border-r-0"
                          >
                            {items.length > 0 ? (
                              <div className="space-y-3">
                                {items.map(
                                  (item) => (
                                    <ScheduleCard
                                      key={item.id}
                                      item={item}
                                      onEdit={
                                        openEditForm
                                      }
                                      onDelete={
                                        openDeleteModal
                                      }
                                    />
                                  ),
                                )}
                              </div>
                            ) : (
                              <EmptyCell />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ),
                )}

                {timePeriods.length === 0 && (
                  <tr>
                    <td
                      colSpan={DAYS.length + 1}
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <CalendarDays size={30} />
                      </div>

                      <h3 className="mt-4 font-extrabold text-slate-700">
                        No schedule found
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Click Add Schedule to create a
                        timetable for this class.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showDeleteModal && (
        <DeleteModal
          deleting={deleting}
          onCancel={closeDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function ScheduleForm({
  form,
  editingId,
  classes,
  subjects,
  teachers,
  saving,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {editingId
              ? "Edit Schedule"
              : "Add New Schedule"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete the schedule information below
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
        >
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        <FormSelect
          label="Class"
          name="class_id"
          value={form.class_id}
          onChange={onChange}
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
          onChange={onChange}
          required
          disabled={!form.class_id}
        >
          <option value="">
            {form.class_id
              ? "Select subject"
              : "Select class first"}
          </option>

          {subjects.map((item) => (
            <option
              key={item.value}
              value={item.value}
            >
              {item.label}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Teacher"
          name="teacher_id"
          value={form.teacher_id}
          onChange={onChange}
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

          {teachers.map((item) => (
            <option
              key={item.value}
              value={item.value}
            >
              {item.label}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Day"
          name="day"
          value={form.day}
          onChange={onChange}
          required
        >
          <option value="">
            Select day
          </option>

          {DAYS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </FormSelect>

        <FormInput
          label="Start Time"
          type="time"
          name="start_time"
          value={form.start_time}
          onChange={onChange}
          required
        />

        <FormInput
          label="End Time"
          type="time"
          name="end_time"
          value={form.end_time}
          onChange={onChange}
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
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function ScheduleCard({
  item,
  onEdit,
  onDelete,
}) {
  return (
    <div className="group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <SubjectIcon subject={item.subject_name} />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            title="Edit schedule"
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:bg-blue-600 hover:text-white"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            title="Delete schedule"
            onClick={() =>
              onDelete(item.id)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-500 shadow-sm transition hover:bg-red-500 hover:text-white"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="mt-4 font-extrabold text-blue-800">
        {item.subject_name ||
          `Subject ${item.subject_id || ""}`}
      </h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <UserRound
          size={15}
          className="shrink-0 text-slate-400"
        />

        <span className="line-clamp-1">
          {item.teacher_name ||
            `Teacher ${item.teacher_id || ""}`}
        </span>
      </div>

      <div className="mt-3 border-t border-blue-100 pt-3 text-xs font-bold text-blue-600">
        {formatTime(item.start_time)} -{" "}
        {formatTime(item.end_time)}
      </div>
    </div>
  );
}

function EmptyCell() {
  return (
    <div className="flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xl text-slate-300">
      —
    </div>
  );
}

function DeleteModal({
  deleting,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <TriangleAlert size={31} />
        </div>

        <h2 className="mt-5 text-center text-xl font-extrabold text-slate-900">
          Delete Schedule
        </h2>

        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Are you sure you want to delete this
          schedule? This action cannot be undone.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={17} />
            )}

            Delete
          </button>
        </div>
      </div>
    </div>
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

function FormInput({ label, ...props }) {
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

  const section = item.section || "";

  return `${name}${section ? ` ${section}` : ""}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatTime(value) {
  if (!value) return "-";

  const parts = String(value).split(":");

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return String(value);
}

function timeToMinutes(value) {
  if (!value) return 0;

  const [hours, minutes] = String(value)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return 0;
  }

  return hours * 60 + minutes;
}

function getErrorMessage(
  error,
  fallbackMessage,
) {
  const detail =
    error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map(
        (item) =>
          item?.msg || "Validation error",
      )
      .join(", ");
  }

  return fallbackMessage;
}