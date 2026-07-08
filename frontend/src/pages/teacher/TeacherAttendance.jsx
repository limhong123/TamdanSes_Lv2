import { CalendarCheck, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherAttendance() {
  const today = new Date().toISOString().slice(0, 10);

  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedSchedule = schedules.find(
    (s) => Number(s.id) === Number(scheduleId)
  );

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const getStatusLabel = (status) => {
    const s = String(status || "").trim().toLowerCase();

    if (s === "p" || s === "present") return "Present";
    if (s === "a" || s === "absent") return "Absent";
    if (s === "l" || s === "permission") return "Permission";

    return "-";
  };

  const getStatusClass = (status) => {
    const label = getStatusLabel(status);

    if (label === "Present") return "bg-green-100 text-green-700";
    if (label === "Absent") return "bg-red-100 text-red-700";
    if (label === "Permission") return "bg-yellow-100 text-yellow-700";

    return "bg-slate-100 text-slate-700";
  };

  const isPermissionStatus = (status) => {
    const s = String(status || "").trim().toLowerCase();
    return s === "l" || s === "permission";
  };

  useEffect(() => {
    api
      .get("/schedules/teacher/me")
      .then((res) => setSchedules(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSchedules([]));
  }, []);

  const loadAttendance = async () => {
    if (!scheduleId || !date) {
      showMessage("error", "Please select schedule and date");
      return;
    }

    try {
      const [attendanceRes, permissionRes] = await Promise.all([
        api.get(`/attendance/schedule/${scheduleId}`, {
          params: { attendance_date: date },
        }),
        api.get("/permissions/teacher/me"),
      ]);

      const attendanceStudents = Array.isArray(attendanceRes.data.students)
        ? attendanceRes.data.students
        : [];

      const permissions = Array.isArray(permissionRes.data)
        ? permissionRes.data
        : [];

      const studentsWithPermission = attendanceStudents.map((student) => {
        const approvedPermission = permissions.find((p) => {
          return (
            Number(p.student_id) === Number(student.student_id) &&
            Number(p.class_id) === Number(selectedSchedule?.class_id) &&
            String(p.status || "").toLowerCase() === "approved" &&
            date >= p.start_date &&
            date <= p.end_date
          );
        });

        if (approvedPermission) {
          return {
            ...student,
            status: "L",
            permission_reason: approvedPermission.reason,
          };
        }

        return {
          ...student,
          status: student.status === "Permission" ? "L" : student.status || "P",
          permission_reason: student.permission_reason || "-",
        };
      });

      setStudents(studentsWithPermission);
      setLocked(Boolean(attendanceRes.data.locked));

      if (attendanceRes.data.locked) {
        showMessage("warning", "Attendance already submitted.");
      }
    } catch (err) {
      showMessage(
        "error",
        err?.response?.data?.detail || "Cannot load attendance"
      );
    }
  };

  const toggleStatus = (studentId) => {
    if (locked) {
      showMessage("warning", "Attendance already saved.");
      return;
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id !== studentId) return s;

        if (isPermissionStatus(s.status)) {
          showMessage("warning", "This student has approved permission.");
          return s;
        }

        return {
          ...s,
          status: s.status === "P" ? "A" : "P",
        };
      })
    );
  };

  const saveAttendance = async () => {
    if (locked) {
      showMessage("warning", "Attendance already submitted.");
      return;
    }

    if (!scheduleId || !date) {
      showMessage("error", "Please select schedule and date");
      return;
    }

    if (students.length === 0) {
      showMessage("error", "No students to save");
      return;
    }

    try {
      await api.post("/attendance/save", {
        schedule_id: Number(scheduleId),
        date,
        items: students.map((s) => ({
          student_id: s.student_id,
          status: isPermissionStatus(s.status) ? "L" : s.status,
        })),
      });

      setLocked(true);
      showMessage("success", "Attendance saved successfully");
    } catch (err) {
      showMessage(
        "error",
        err?.response?.data?.detail || "Save attendance failed"
      );
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : message.type === "warning"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <p className="font-semibold">{message.text}</p>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <CalendarCheck className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
          <p className="text-sm text-slate-500">
            Approved permission will show automatically
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            value={scheduleId}
            onChange={(e) => {
              setScheduleId(e.target.value);
              setStudents([]);
              setLocked(false);
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          >
            <option value="">Select Schedule</option>

            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class_name} - {s.subject_name} - {s.day} ({s.start_time} -{" "}
                {s.end_time})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStudents([]);
              setLocked(false);
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          />

          <button
            onClick={loadAttendance}
            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Load Students
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Gender</th>
              <th className="p-4 text-center">Permission Reason</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.student_id} className="border-t border-slate-100">
                <td className="p-4 font-medium text-slate-800">
                  {s.student_name}
                </td>

                <td className="p-4 text-slate-600">{s.gender || "-"}</td>

                <td className="p-4 text-center text-slate-600">
                  {s.permission_reason || "-"}
                </td>

                <td className="p-4 text-center">
                  <button
                    type="button"
                    disabled={locked || isPermissionStatus(s.status)}
                    onClick={() => toggleStatus(s.student_id)}
                    className={`rounded-xl px-6 py-2 font-bold transition ${getStatusClass(
                      s.status
                    )} ${
                      locked || isPermissionStatus(s.status)
                        ? "cursor-not-allowed opacity-70"
                        : "hover:scale-105"
                    }`}
                  >
                    {getStatusLabel(s.status)}
                  </button>
                </td>
              </tr>
            ))}

            {students.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-500">
                  Select schedule and date
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <button
          onClick={saveAttendance}
          disabled={locked}
          className={`mt-6 rounded-xl px-6 py-3 font-semibold text-white ${
            locked
              ? "cursor-not-allowed bg-slate-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {locked ? "Attendance Locked" : "Save Attendance"}
        </button>
      )}
    </div>
  );
}