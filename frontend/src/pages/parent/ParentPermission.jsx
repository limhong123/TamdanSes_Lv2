import {
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  GraduationCap,
  LoaderCircle,
  Send,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";

export default function ParentPermission() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [items, setItems] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [form, setForm] = useState({
    request_type: "subject",
    schedule_id: "",
    type: "Sick",
    reason: "",
  });

  // =====================================================
  // Message
  // =====================================================

  const showMessage = (type, text) => {
    setMessage({
      type,
      text,
    });

    window.clearTimeout(showMessage.timer);

    showMessage.timer = window.setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  // =====================================================
  // Helpers
  // =====================================================

  const getErrorMessage = (error, defaultMessage) => {
    const detail = error?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || "Validation error")
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    return defaultMessage;
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";

    if (typeof value === "string" && value.includes(":")) {
      const parts = value.split(":");
      return `${parts[0]}:${parts[1]}`;
    }

    return value;
  };

  const normalizeStatus = (status) => {
    return String(status || "pending").toLowerCase();
  };

  const getStatusStyle = (status) => {
    const value = normalizeStatus(status);

    if (value === "approved" || value === "accepted") {
      return {
        label: "Approved",
        className: "bg-emerald-100 text-emerald-700",
        icon: <CheckCircle size={16} />,
      };
    }

    if (value === "rejected" || value === "declined") {
      return {
        label: "Rejected",
        className: "bg-red-100 text-red-700",
        icon: <XCircle size={16} />,
      };
    }

    return {
      label: "Pending",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock size={16} />,
    };
  };

  // =====================================================
  // Selected student
  // =====================================================

  const selectedStudent = useMemo(() => {
    return students.find(
      (student) => String(student.id) === String(selectedStudentId),
    );
  }, [students, selectedStudentId]);

  // =====================================================
  // Load children
  // Change endpoint if your backend uses another URL.
  // =====================================================

  const fetchStudents = async () => {
    try {
      setLoadingData(true);

      const response = await api.get("/permissions/parent/students");

      const result = response.data;
      const studentList = Array.isArray(result)
        ? result
        : result?.students || result?.children || [];

      setStudents(studentList);

      if (studentList.length > 0) {
        setSelectedStudentId((currentId) => {
          if (currentId) return currentId;
          return String(studentList[0].id);
        });
      } else {
        setSelectedStudentId("");
      }
    } catch (error) {
      console.error("Fetch parent students error:", error);

      setStudents([]);

      showMessage(
        "error",
        getErrorMessage(error, "Unable to load your children."),
      );
    } finally {
      setLoadingData(false);
    }
  };

  // =====================================================
  // Load permission requests
  // =====================================================

  const fetchPermissions = async (studentId) => {
    if (!studentId) {
      setItems([]);
      return;
    }

    try {
      const response = await api.get(
        `/permissions/parent/student/${studentId}`,
      );

      const result = response.data;

      setItems(
        Array.isArray(result)
          ? result
          : result?.permissions || result?.items || [],
      );
    } catch (error) {
      console.error("Fetch parent permissions error:", error);

      setItems([]);

      showMessage(
        "error",
        getErrorMessage(error, "Unable to load permission requests."),
      );
    }
  };

  // =====================================================
  // Load student's schedules
  // =====================================================

  const fetchSchedules = async (studentId) => {
    if (!studentId) {
      setSchedules([]);
      return;
    }

    try {
      setLoadingSchedules(true);

      const response = await api.get(
        `/permissions/parent/student/${studentId}/schedules`,
      );

      const result = response.data;

      setSchedules(
        Array.isArray(result)
          ? result
          : result?.schedules || result?.items || [],
      );
    } catch (error) {
      console.error("Fetch schedules error:", error);

      setSchedules([]);

      showMessage(
        "error",
        getErrorMessage(error, "Unable to load student schedules."),
      );
    } finally {
      setLoadingSchedules(false);
    }
  };

  // =====================================================
  // Initial loading
  // =====================================================

  useEffect(() => {
    fetchStudents();

    return () => {
      window.clearTimeout(showMessage.timer);
    };
  }, []);

  // =====================================================
  // Reload data when child changes
  // =====================================================

  useEffect(() => {
    if (!selectedStudentId) {
      setItems([]);
      setSchedules([]);
      return;
    }

    setForm((previous) => ({
      ...previous,
      schedule_id: "",
    }));

    Promise.all([
      fetchPermissions(selectedStudentId),
      fetchSchedules(selectedStudentId),
    ]);
  }, [selectedStudentId]);

  // =====================================================
  // Form
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleRequestTypeChange = (event) => {
    const value = event.target.value;

    setForm((previous) => ({
      ...previous,
      request_type: value,
      schedule_id: value === "subject" ? previous.schedule_id : "",
    }));
  };

  const resetForm = () => {
    setForm({
      request_type: "subject",
      schedule_id: "",
      type: "Sick",
      reason: "",
    });
  };

  const submitPermission = async (event) => {
    event.preventDefault();

    if (!selectedStudentId) {
      showMessage("error", "Please select a student.");
      return;
    }

    if (form.request_type === "subject" && !form.schedule_id) {
      showMessage("error", "Please select a subject schedule.");
      return;
    }

    if (!form.type.trim()) {
      showMessage("error", "Please select a permission type.");
      return;
    }

    if (!form.reason.trim()) {
      showMessage("error", "Please enter the reason.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        student_id: Number(selectedStudentId),
        request_type: form.request_type,
        type: form.type.trim(),
        reason: form.reason.trim(),
        schedule_id:
          form.request_type === "subject"
            ? Number(form.schedule_id)
            : null,
      };

      await api.post("/permissions/parent", payload);

      showMessage("success", "Permission request sent successfully.");

      resetForm();
      await fetchPermissions(selectedStudentId);
    } catch (error) {
      console.error("Create parent permission error:", error);

      showMessage(
        "error",
        getErrorMessage(error, "Unable to send permission request."),
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Schedule label
  // =====================================================

  const getScheduleLabel = (schedule) => {
    const subjectName =
      schedule.subject_name ||
      schedule.subject?.name ||
      schedule.subject ||
      "Unknown subject";

    const teacherName =
      schedule.teacher_name ||
      schedule.teacher?.full_name ||
      schedule.teacher ||
      "";

    const day =
      schedule.day_of_week ||
      schedule.day ||
      schedule.schedule_day ||
      "";

    const startTime =
      schedule.start_time ||
      schedule.time_start ||
      "";

    const endTime =
      schedule.end_time ||
      schedule.time_end ||
      "";

    const timeText =
      startTime || endTime
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : "";

    return [
      subjectName,
      teacherName ? `Teacher: ${teacherName}` : "",
      day,
      timeText,
    ]
      .filter(Boolean)
      .join(" • ");
  };

  // =====================================================
  // Loading UI
  // =====================================================

  if (loadingData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin" size={35} />
          <p>Loading parent permission data...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}

        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-3">
              <FileText size={30} />
            </div>

            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Parent Permission
              </h1>

              <p className="mt-1 text-sm text-blue-100">
                Request permission for your child to leave a subject or a full
                school day.
              </p>
            </div>
          </div>
        </div>

        {/* Message */}

        {message && (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="mt-0.5 shrink-0" size={20} />
            ) : (
              <XCircle className="mt-0.5 shrink-0" size={20} />
            )}

            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {students.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <GraduationCap
              className="mx-auto mb-4 text-slate-300"
              size={55}
            />

            <h2 className="text-xl font-semibold text-slate-800">
              No student connected
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your parent account is not connected to any student.
            </p>
          </div>
        ) : (
          <>
            {/* Student selector */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label
                htmlFor="student"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Select your child
              </label>

              <div className="relative">
                <GraduationCap
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />

                <select
                  id="student"
                  value={selectedStudentId}
                  onChange={(event) =>
                    setSelectedStudentId(event.target.value)
                  }
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name ||
                        student.student_name ||
                        student.name ||
                        `Student ${student.id}`}
                      {student.student_code
                        ? ` (${student.student_code})`
                        : ""}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
              </div>

              {selectedStudent && (
                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <StudentInfo
                    label="Student"
                    value={
                      selectedStudent.full_name ||
                      selectedStudent.student_name ||
                      selectedStudent.name
                    }
                  />

                  <StudentInfo
                    label="Student ID"
                    value={
                      selectedStudent.student_code ||
                      selectedStudent.code ||
                      selectedStudent.id
                    }
                  />

                  <StudentInfo
                    label="Class"
                    value={
                      selectedStudent.class_name ||
                      selectedStudent.school_class_name ||
                      selectedStudent.class?.name ||
                      "-"
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
              {/* Permission form */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    New Permission Request
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Complete the form and submit it to the responsible teacher.
                  </p>
                </div>

                <form onSubmit={submitPermission} className="space-y-5">
                  {/* Request type */}

                  <div>
                    <label
                      htmlFor="request_type"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Request for
                    </label>

                    <select
                      id="request_type"
                      name="request_type"
                      value={form.request_type}
                      onChange={handleRequestTypeChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="subject">One subject</option>
                      <option value="day">Full school day</option>
                    </select>
                  </div>

                  {/* Schedule */}

                  {form.request_type === "subject" && (
                    <div>
                      <label
                        htmlFor="schedule_id"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Subject schedule
                      </label>

                      <select
                        id="schedule_id"
                        name="schedule_id"
                        value={form.schedule_id}
                        onChange={handleChange}
                        disabled={loadingSchedules}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          {loadingSchedules
                            ? "Loading schedules..."
                            : "Select subject schedule"}
                        </option>

                        {schedules.map((schedule) => (
                          <option
                            key={schedule.id}
                            value={schedule.id}
                          >
                            {getScheduleLabel(schedule)}
                          </option>
                        ))}
                      </select>

                      {!loadingSchedules &&
                        schedules.length === 0 && (
                          <p className="mt-2 text-xs text-amber-600">
                            No schedule was found for this student.
                          </p>
                        )}
                    </div>
                  )}

                  {/* Permission type */}

                  <div>
                    <label
                      htmlFor="type"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Permission type
                    </label>

                    <select
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Sick">Sick</option>
                      <option value="Family">Family matter</option>
                      <option value="Personal">Personal matter</option>
                      <option value="Appointment">Appointment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Reason */}

                  <div>
                    <label
                      htmlFor="reason"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Reason
                    </label>

                    <textarea
                      id="reason"
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      rows={5}
                      maxLength={500}
                      placeholder="Please explain why your child needs permission..."
                      className="w-full resize-none rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <div className="mt-1 text-right text-xs text-slate-400">
                      {form.reason.length}/500
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle
                          className="animate-spin"
                          size={18}
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send permission request
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Permission history */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Permission History
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Requests submitted for the selected student.
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    {items.length}
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <FileText
                      className="mb-3 text-slate-300"
                      size={48}
                    />

                    <h3 className="font-semibold text-slate-700">
                      No permission requests
                    </h3>

                    <p className="mt-1 max-w-sm text-sm text-slate-500">
                      Permission requests for this student will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => {
                      const status = getStatusStyle(item.status);

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">
                                  {item.type ||
                                    item.permission_type ||
                                    "Permission"}
                                </h3>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                                >
                                  {status.icon}
                                  {status.label}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.request_type === "day"
                                  ? "Full school day"
                                  : item.subject_name ||
                                    item.schedule?.subject_name ||
                                    "Subject permission"}
                              </p>
                            </div>

                            <div className="text-sm text-slate-500">
                              {formatDate(
                                item.created_at ||
                                  item.request_date ||
                                  item.date,
                              )}
                            </div>
                          </div>

                          <div className="mt-4 rounded-lg bg-slate-50 p-3">
                            <p className="text-sm leading-6 text-slate-700">
                              {item.reason || "No reason provided."}
                            </p>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <PermissionDetail
                              label="Student"
                              value={
                                item.student_name ||
                                selectedStudent?.full_name ||
                                selectedStudent?.student_name ||
                                "-"
                              }
                            />

                            <PermissionDetail
                              label="Teacher"
                              value={
                                item.teacher_name ||
                                item.teacher?.full_name ||
                                "-"
                              }
                            />

                            {item.subject_name && (
                              <PermissionDetail
                                label="Subject"
                                value={item.subject_name}
                              />
                            )}

                            {item.schedule_date && (
                              <PermissionDetail
                                label="Schedule date"
                                value={formatDate(item.schedule_date)}
                              />
                            )}
                          </div>

                          {(item.response_reason ||
                            item.teacher_comment ||
                            item.note) && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Teacher response
                              </p>

                              <p className="text-sm text-slate-700">
                                {item.response_reason ||
                                  item.teacher_comment ||
                                  item.note}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Child components
// =====================================================

function StudentInfo({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

function PermissionDetail({ label, value }) {
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className="font-medium text-slate-700">{value || "-"}</span>
    </div>
  );
}