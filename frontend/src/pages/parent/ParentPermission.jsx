import {
  ArrowLeft,
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
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import api from "../../api/axios";

export default function ParentPermission() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const studentIdFromUrl =
    searchParams.get("student_id");

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] =
    useState(
      studentIdFromUrl ||
        localStorage.getItem(
          "selected_student_id",
        ) ||
        "",
    );

  const [items, setItems] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] =
    useState(true);
  const [loadingSchedules, setLoadingSchedules] =
    useState(false);
  const [loadingPermissions, setLoadingPermissions] =
    useState(false);

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

  const getErrorMessage = (
    error,
    defaultMessage,
  ) => {
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

    return defaultMessage;
  };

  const getLocalStudents = () => {
    try {
      const result = JSON.parse(
        localStorage.getItem(
          "parent_students",
        ) || "[]",
      );

      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  };

  const normalizeList = (
    result,
    possibleKeys = [],
  ) => {
    if (Array.isArray(result)) {
      return result;
    }

    for (const key of possibleKeys) {
      if (Array.isArray(result?.[key])) {
        return result[key];
      }
    }

    return [];
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

    const stringValue = String(value);

    if (stringValue.includes(":")) {
      const parts = stringValue.split(":");
      return `${parts[0]}:${parts[1]}`;
    }

    return stringValue;
  };

  // =====================================================
  // Selected child
  // =====================================================

  const selectedStudent = useMemo(() => {
    return students.find(
      (student) =>
        String(student.id) ===
        String(selectedStudentId),
    );
  }, [students, selectedStudentId]);

  // =====================================================
  // Load students
  // =====================================================

  const fetchStudents = async () => {
    try {
      setLoadingData(true);

      let studentList = [];

      try {
        const response = await api.get(
          "/permissions/parent/students",
        );

        studentList = normalizeList(
          response.data,
          ["students", "children"],
        );
      } catch (error) {
        console.warn(
          "Using parent students from localStorage.",
          error,
        );

        studentList = getLocalStudents();
      }

      setStudents(studentList);

      if (studentList.length > 0) {
        const requestedStudentExists =
          studentList.some(
            (student) =>
              String(student.id) ===
              String(selectedStudentId),
          );

        const initialId =
          requestedStudentExists
            ? String(selectedStudentId)
            : String(studentList[0].id);

        setSelectedStudentId(initialId);

        localStorage.setItem(
          "selected_student_id",
          initialId,
        );
      }
    } catch (error) {
      console.error(
        "Fetch parent students error:",
        error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Unable to load your children.",
        ),
      );
    } finally {
      setLoadingData(false);
    }
  };

  // =====================================================
  // Load permission history
  // =====================================================

  const fetchPermissions = async (studentId) => {
    if (!studentId) {
      setItems([]);
      return;
    }

    try {
      setLoadingPermissions(true);

      const response = await api.get(
        `/permissions/parent/student/${studentId}`,
      );

      setItems(
        normalizeList(response.data, [
          "permissions",
          "items",
          "requests",
        ]),
      );
    } catch (error) {
      console.error(
        "Fetch permissions error:",
        error,
      );

      setItems([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Unable to load permission requests.",
        ),
      );
    } finally {
      setLoadingPermissions(false);
    }
  };

  // =====================================================
  // Load schedules
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

      setSchedules(
        normalizeList(response.data, [
          "schedules",
          "items",
        ]),
      );
    } catch (error) {
      console.error(
        "Fetch schedules error:",
        error,
      );

      setSchedules([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Unable to load student schedules.",
        ),
      );
    } finally {
      setLoadingSchedules(false);
    }
  };

  // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    fetchStudents();

    return () => {
      window.clearTimeout(showMessage.timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setItems([]);
      setSchedules([]);
      return;
    }

    localStorage.setItem(
      "selected_student_id",
      selectedStudentId,
    );

    localStorage.setItem(
      "student_id",
      selectedStudentId,
    );

    setForm((previous) => ({
      ...previous,
      schedule_id: "",
    }));

    fetchPermissions(selectedStudentId);
    fetchSchedules(selectedStudentId);
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
      schedule_id:
        value === "subject"
          ? previous.schedule_id
          : "",
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
      showMessage(
        "error",
        "Please select a student.",
      );
      return;
    }

    if (
      form.request_type === "subject" &&
      !form.schedule_id
    ) {
      showMessage(
        "error",
        "Please select a subject schedule.",
      );
      return;
    }

    if (!form.reason.trim()) {
      showMessage(
        "error",
        "Please enter the permission reason.",
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        student_id: Number(selectedStudentId),
        request_type: form.request_type,
        schedule_id:
          form.request_type === "subject"
            ? Number(form.schedule_id)
            : null,
        type: form.type,
        reason: form.reason.trim(),
      };

      await api.post(
        "/permissions/parent",
        payload,
      );

      showMessage(
        "success",
        "Permission request sent successfully.",
      );

      resetForm();

      await fetchPermissions(
        selectedStudentId,
      );
    } catch (error) {
      console.error(
        "Submit permission error:",
        error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Unable to send permission request.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Status
  // =====================================================

  const getStatus = (statusValue) => {
    const status = String(
      statusValue || "pending",
    ).toLowerCase();

    if (
      status === "approved" ||
      status === "accepted"
    ) {
      return {
        label: "Approved",
        icon: CheckCircle,
        className:
          "bg-green-100 text-green-700",
      };
    }

    if (
      status === "rejected" ||
      status === "declined"
    ) {
      return {
        label: "Rejected",
        icon: XCircle,
        className: "bg-red-100 text-red-700",
      };
    }

    return {
      label: "Pending",
      icon: Clock,
      className:
        "bg-amber-100 text-amber-700",
    };
  };

  const getScheduleLabel = (schedule) => {
    const subject =
      schedule.subject_name ||
      schedule.subject?.name ||
      "Subject";

    const teacher =
      schedule.teacher_name ||
      schedule.teacher?.full_name ||
      "";

    const day =
      schedule.day_of_week ||
      schedule.day ||
      "";

    const start =
      schedule.start_time ||
      schedule.time_start;

    const end =
      schedule.end_time ||
      schedule.time_end;

    return [
      subject,
      teacher ? `Teacher: ${teacher}` : "",
      day,
      start || end
        ? `${formatTime(start)} - ${formatTime(end)}`
        : "",
    ]
      .filter(Boolean)
      .join(" • ");
  };

  // =====================================================
  // Loading page
  // =====================================================

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle
            size={38}
            className="animate-spin"
          />

          <p>Loading permission page...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}

        <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-6 text-white shadow-lg md:p-8">
          <button
            type="button"
            onClick={() => navigate("/parent")}
            className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <FileText size={30} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold md:text-3xl">
                    Parent Permission
                  </h1>

                  <p className="mt-1 text-blue-100">
                    Request permission for your
                    child.
                  </p>
                </div>
              </div>
            </div>

            {students.length > 0 && (
              <div className="w-full md:max-w-sm">
                <label className="mb-2 block text-sm font-semibold">
                  Select Child
                </label>

                <div className="relative">
                  <GraduationCap
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={selectedStudentId}
                    onChange={(event) =>
                      setSelectedStudentId(
                        event.target.value,
                      )
                    }
                    className="w-full appearance-none rounded-2xl bg-white py-4 pl-12 pr-11 font-semibold text-slate-800 outline-none"
                  >
                    {students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.full_name ||
                          student.student_name ||
                          student.name ||
                          "Student"}
                        {student.student_code
                          ? ` - ${student.student_code}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={20}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message */}

        {message && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <XCircle size={21} />
            )}

            <p className="font-medium">
              {message.text}
            </p>
          </div>
        )}

        {students.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <GraduationCap
              size={60}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-800">
              No student connected
            </h2>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            {/* Form */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                New Permission Request
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Send a request for{" "}
                {selectedStudent?.full_name ||
                  selectedStudent?.student_name ||
                  selectedStudent?.name ||
                  "your child"}.
              </p>

              <form
                onSubmit={submitPermission}
                className="mt-6 space-y-5"
              >
                <FormSelect
                  label="Request for"
                  name="request_type"
                  value={form.request_type}
                  onChange={
                    handleRequestTypeChange
                  }
                >
                  <option value="subject">
                    One subject
                  </option>

                  <option value="day">
                    Full school day
                  </option>
                </FormSelect>

                {form.request_type ===
                  "subject" && (
                  <FormSelect
                    label="Subject schedule"
                    name="schedule_id"
                    value={form.schedule_id}
                    onChange={handleChange}
                    disabled={loadingSchedules}
                  >
                    <option value="">
                      {loadingSchedules
                        ? "Loading schedules..."
                        : "Select subject schedule"}
                    </option>

                    {schedules.map(
                      (schedule) => (
                        <option
                          key={schedule.id}
                          value={schedule.id}
                        >
                          {getScheduleLabel(
                            schedule,
                          )}
                        </option>
                      ),
                    )}
                  </FormSelect>
                )}

                <FormSelect
                  label="Permission type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
                  <option value="Sick">
                    Sick
                  </option>

                  <option value="Family">
                    Family matter
                  </option>

                  <option value="Personal">
                    Personal matter
                  </option>

                  <option value="Appointment">
                    Appointment
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </FormSelect>

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
                    placeholder="Enter permission reason..."
                    className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {form.reason.length}/500
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle
                        size={19}
                        className="animate-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={19} />
                      Send Request
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Permission history */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Permission History
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Requests for the selected child.
                  </p>
                </div>

                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600">
                  {items.length}
                </div>
              </div>

              {loadingPermissions ? (
                <div className="flex min-h-[350px] items-center justify-center">
                  <LoaderCircle
                    size={35}
                    className="animate-spin text-blue-600"
                  />
                </div>
              ) : items.length === 0 ? (
                <div className="mt-6 flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <FileText
                    size={55}
                    className="text-slate-300"
                  />

                  <h3 className="mt-4 font-bold text-slate-700">
                    No permission requests
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    New requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {items.map((item) => {
                    const status =
                      getStatus(item.status);

                    const StatusIcon =
                      status.icon;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">
                                {item.type ||
                                  item.permission_type ||
                                  "Permission"}
                              </h3>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                              >
                                <StatusIcon
                                  size={15}
                                />

                                {status.label}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.request_type ===
                              "day"
                                ? "Full school day"
                                : item.subject_name ||
                                  item.schedule
                                    ?.subject_name ||
                                  "Subject permission"}
                            </p>
                          </div>

                          <p className="text-sm text-slate-400">
                            {formatDate(
                              item.created_at ||
                                item.request_date ||
                                item.date,
                            )}
                          </p>
                        </div>

                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                          <p className="text-sm leading-6 text-slate-700">
                            {item.reason ||
                              "No reason provided."}
                          </p>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <PermissionInfo
                            label="Student"
                            value={
                              item.student_name ||
                              selectedStudent?.full_name ||
                              selectedStudent?.student_name ||
                              selectedStudent?.name
                            }
                          />

                          <PermissionInfo
                            label="Teacher"
                            value={
                              item.teacher_name ||
                              item.teacher
                                ?.full_name ||
                              "-"
                            }
                          />

                          {item.subject_name && (
                            <PermissionInfo
                              label="Subject"
                              value={
                                item.subject_name
                              }
                            />
                          )}
                        </div>

                        {(item.teacher_comment ||
                          item.response_reason ||
                          item.note) && (
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Teacher response
                            </p>

                            <p className="mt-1 text-sm text-slate-700">
                              {item.teacher_comment ||
                                item.response_reason ||
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
        )}
      </div>
    </div>
  );
}

// =====================================================
// Child components
// =====================================================

function FormSelect({
  label,
  children,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        {...props}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {children}
      </select>
    </div>
  );
}

function PermissionInfo({ label, value }) {
  return (
    <p>
      <span className="text-slate-400">
        {label}:{" "}
      </span>

      <span className="font-semibold text-slate-700">
        {value || "-"}
      </span>
    </p>
  );
}