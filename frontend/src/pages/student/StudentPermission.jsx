import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Send,
  UserRoundCheck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const permissionTypes = [
  { value: "Sick", label: "Sick" },
  { value: "Family", label: "Family" },
  { value: "Personal", label: "Personal" },
  { value: "Other", label: "Other" },
];

export default function StudentPermission() {
  const [items, setItems] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [subjectForm, setSubjectForm] = useState({
    type: "Sick",
    reason: "",
  });

  const [fullDayForm, setFullDayForm] = useState({
    type: "Sick",
    reason: "",
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const loadPermissions = async () => {
    try {
      const response = await api.get("/permissions/student/me");

      setItems(
        Array.isArray(response.data)
          ? response.data
          : [],
      );
    } catch (error) {
      console.error(
        "LOAD PERMISSIONS ERROR:",
        error?.response?.data || error,
      );

      setItems([]);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await api.get("/schedules/student/me");

      setSchedules(
        Array.isArray(response.data)
          ? response.data
          : [],
      );
    } catch (error) {
      console.error(
        "LOAD SCHEDULES ERROR:",
        error?.response?.data || error,
      );

      setSchedules([]);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      await Promise.all([
        loadPermissions(),
        loadSchedules(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(new Date());
  }, []);

  const todaySchedules = useMemo(() => {
    return schedules
      .filter(
        (schedule) =>
          schedule.day?.toLowerCase() ===
          todayName.toLowerCase(),
      )
      .sort((a, b) =>
        String(a.start_time).localeCompare(
          String(b.start_time),
        ),
      );
  }, [schedules, todayName]);

  const formatTime = (time) => {
    if (!time) return "--:--";

    return String(time).slice(0, 5);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsedDate);
  };

  const openSubjectModal = (schedule) => {
    setSelectedSchedule(schedule);

    setSubjectForm({
      type: "Sick",
      reason: "",
    });
  };

  const closeSubjectModal = () => {
    if (isSubmitting) return;

    setSelectedSchedule(null);

    setSubjectForm({
      type: "Sick",
      reason: "",
    });
  };

  const submitSubjectPermission = async (event) => {
    event.preventDefault();

    if (!selectedSchedule?.id) {
      showMessage(
        "error",
        "Please select a subject",
      );
      return;
    }

    if (!subjectForm.reason.trim()) {
      showMessage(
        "error",
        "Please write a reason",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await api.post("/permissions/", {
        request_type: "subject",
        schedule_id: Number(selectedSchedule.id),
        type: subjectForm.type,
        reason: subjectForm.reason.trim(),
      });

      showMessage(
        "success",
        "Permission request submitted successfully",
      );

      closeSubjectModal();
      await loadPermissions();
    } catch (error) {
      console.error(
        "SUBMIT SUBJECT PERMISSION ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        error?.response?.data?.detail ||
          "Submit failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFullDayPermission = async (event) => {
    event.preventDefault();

    if (!fullDayForm.reason.trim()) {
      showMessage(
        "error",
        "Please write a reason",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await api.post("/permissions/", {
        request_type: "full_day",
        schedule_id: null,
        type: fullDayForm.type,
        reason: fullDayForm.reason.trim(),
      });

      setFullDayForm({
        type: "Sick",
        reason: "",
      });

      showMessage(
        "success",
        "Full-day permission submitted successfully",
      );

      await loadPermissions();
    } catch (error) {
      console.error(
        "SUBMIT FULL DAY PERMISSION ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        error?.response?.data?.detail ||
          "Submit failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (String(status).toLowerCase()) {
      case "approved":
        return {
          text: "Approved",
          className:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",
          icon: CheckCircle,
        };

      case "rejected":
        return {
          text: "Rejected",
          className:
            "bg-red-50 text-red-700 ring-red-200",
          icon: XCircle,
        };

      default:
        return {
          text: "Pending",
          className:
            "bg-amber-50 text-amber-700 ring-amber-200",
          icon: Clock3,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

          <p className="text-sm font-medium">
            Loading permission data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-7 pb-10">
      {message && (
        <div
          className={`fixed right-5 top-5 z-[100] flex max-w-md items-center gap-3 rounded-2xl border px-5 py-4 shadow-xl ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}

          <p className="text-sm font-semibold">
            {message.text}
          </p>
        </div>
      )}

      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <FileText className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Permission Request
              </h1>

              <p className="mt-1 text-sm text-blue-100 sm:text-base">
                Select today&apos;s class or request
                permission for the full day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
            <CalendarDays className="h-5 w-5" />

            <div>
              <p className="text-xs text-blue-100">
                Today
              </p>

              <p className="font-semibold">
                {todayName}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Today's schedules */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Today&apos;s Classes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the class you cannot attend.
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {todaySchedules.length} classes
          </span>
        </div>

        {todaySchedules.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todaySchedules.map((schedule, index) => (
              <article
                key={schedule.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />

                <div className="p-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-600">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                          Subject
                        </p>

                        <h3 className="truncate text-lg font-bold text-slate-800">
                          {schedule.subject_name ||
                            "Unknown subject"}
                        </h3>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                      <UserRoundCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <CalendarDays className="h-4 w-4 text-blue-600" />

                      <span className="font-medium">
                        {schedule.day}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Clock3 className="h-4 w-4 text-blue-600" />

                      <span className="font-medium">
                        {formatTime(schedule.start_time)}
                        {" - "}
                        {formatTime(schedule.end_time)}
                      </span>
                    </div>

                    {schedule.teacher_name && (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <UserRoundCheck className="h-4 w-4 text-blue-600" />

                        <span className="truncate font-medium">
                          {schedule.teacher_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openSubjectModal(schedule)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    Request Permission
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <CalendarDays className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-800">
              No classes today
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              There are no subjects scheduled for{" "}
              {todayName}. You can still request
              full-day permission below.
            </p>
          </div>
        )}
      </section>

      {/* Full-day permission */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
              <CalendarDays className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Full-Day Permission
              </h2>

              <p className="text-sm text-slate-500">
                Use this when you cannot attend any
                classes today.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={submitFullDayPermission}
          className="p-6"
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Permission type
              </label>

              <select
                value={fullDayForm.type}
                onChange={(event) =>
                  setFullDayForm({
                    ...fullDayForm,
                    type: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {permissionTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Reason
              </label>

              <input
                type="text"
                value={fullDayForm.reason}
                onChange={(event) =>
                  setFullDayForm({
                    ...fullDayForm,
                    reason: event.target.value,
                  })
                }
                placeholder="Write the reason for your absence..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}

              Submit
            </button>
          </div>
        </form>
      </section>

      {/* Permission history */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            Recent Requests
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review your permission request history.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => {
              const statusStyle = getStatusStyle(
                item.status,
              );

              const StatusIcon = statusStyle.icon;

              return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          item.request_type ===
                          "full_day"
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {item.request_type ===
                        "full_day" ? (
                          <CalendarDays className="h-6 w-6" />
                        ) : (
                          <FileText className="h-6 w-6" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">
                            {item.request_type ===
                            "full_day"
                              ? "Full-Day Permission"
                              : item.subject_name ||
                                "Subject Permission"}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusStyle.text}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />

                            {formatDate(item.start_date)}
                          </span>

                          <span className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4" />

                            {item.request_type ===
                            "full_day"
                              ? "All Day"
                              : `${
                                  item.day || ""
                                } ${formatTime(
                                  item.start_time,
                                )} - ${formatTime(
                                  item.end_time,
                                )}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[480px]">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Type
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {item.type || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Reason
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                          {item.reason || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-800">
              No permission requests
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your submitted requests will appear
              here.
            </p>
          </div>
        )}
      </section>

      {/* Subject permission modal */}
      {selectedSchedule && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSubjectModal();
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Permission request
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-800">
                  {selectedSchedule.subject_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeSubjectModal}
                disabled={isSubmitting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={submitSubjectPermission}
              className="p-6"
            >
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-600">
                    <CalendarDays className="h-4 w-4" />
                    Day
                  </div>

                  <p className="mt-2 font-bold text-slate-800">
                    {selectedSchedule.day}
                  </p>
                </div>

                <div className="rounded-2xl bg-indigo-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-indigo-600">
                    <Clock3 className="h-4 w-4" />
                    Time
                  </div>

                  <p className="mt-2 whitespace-nowrap font-bold text-slate-800">
                    {formatTime(
                      selectedSchedule.start_time,
                    )}
                    {" - "}
                    {formatTime(
                      selectedSchedule.end_time,
                    )}
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Permission type
                </label>

                <select
                  value={subjectForm.type}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      type: event.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {permissionTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </label>

                <textarea
                  value={subjectForm.reason}
                  onChange={(event) =>
                    setSubjectForm({
                      ...subjectForm,
                      reason: event.target.value,
                    })
                  }
                  placeholder="Explain why you cannot attend this class..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeSubjectModal}
                  disabled={isSubmitting}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}

                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}