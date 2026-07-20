import {
  CalendarCheck,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";


export default function TeacherAttendance() {
  const today = new Date().toISOString().slice(0, 10);

  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(today);

  const [students, setStudents] = useState([]);
  const [locked, setLocked] = useState(false);

  const [loadingSchedules, setLoadingSchedules] =
    useState(false);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState(null);


  // =======================================================
  // Selected date day name
  // =======================================================

  const selectedDay = useMemo(() => {
    if (!date) {
      return "";
    }

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const selectedDate = new Date(
      `${date}T00:00:00`,
    );

    return dayNames[selectedDate.getDay()];
  }, [date]);


  // =======================================================
  // Filter schedule by selected date day
  // =======================================================

  const filteredSchedules = useMemo(() => {
    if (!selectedDay) {
      return [];
    }

    return schedules.filter((schedule) => {
      const scheduleDay = String(
        schedule.day || "",
      )
        .trim()
        .toLowerCase();

      return (
        scheduleDay ===
        selectedDay.toLowerCase()
      );
    });
  }, [schedules, selectedDay]);


  const selectedSchedule = schedules.find(
    (schedule) =>
      Number(schedule.id) ===
      Number(scheduleId),
  );


  // =======================================================
  // Message
  // =======================================================

  const showMessage = (type, text) => {
    setMessage({
      type,
      text,
    });

    window.setTimeout(() => {
      setMessage(null);
    }, 3000);
  };


  // =======================================================
  // Attendance status helper
  // =======================================================

  const getStatusLabel = (status) => {
    const normalizedStatus = String(
      status || "",
    )
      .trim()
      .toLowerCase();

    if (
      normalizedStatus === "p" ||
      normalizedStatus === "present"
    ) {
      return "Present";
    }

    if (
      normalizedStatus === "a" ||
      normalizedStatus === "absent"
    ) {
      return "Absent";
    }

    if (
      normalizedStatus === "l" ||
      normalizedStatus === "permission"
    ) {
      return "Permission";
    }

    if (
      normalizedStatus === "e" ||
      normalizedStatus === "excused"
    ) {
      return "Excused";
    }

    return "-";
  };


  const getStatusClass = (status) => {
    const label = getStatusLabel(status);

    if (label === "Present") {
      return "bg-green-100 text-green-700";
    }

    if (label === "Absent") {
      return "bg-red-100 text-red-700";
    }

    if (label === "Permission") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (label === "Excused") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-slate-100 text-slate-700";
  };


  const isPermissionStatus = (status) => {
    const normalizedStatus = String(
      status || "",
    )
      .trim()
      .toLowerCase();

    return (
      normalizedStatus === "l" ||
      normalizedStatus === "permission"
    );
  };


  // =======================================================
  // Load teacher schedules
  // =======================================================

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        setLoadingSchedules(true);

        const response = await api.get(
          "/schedules/teacher/me",
        );

        setSchedules(
          Array.isArray(response.data)
            ? response.data
            : [],
        );
      } catch (error) {
        console.error(
          "Load schedule error:",
          error,
        );

        setSchedules([]);

        showMessage(
          "error",
          error?.response?.data?.detail ||
            "Cannot load schedules",
        );
      } finally {
        setLoadingSchedules(false);
      }
    };

    loadSchedules();
  }, []);


  // =======================================================
  // Clear selected schedule when date changes
  // =======================================================

  useEffect(() => {
    setScheduleId("");
    setStudents([]);
    setLocked(false);
  }, [date]);


  // =======================================================
  // Auto select schedule if only one exists that day
  // =======================================================

  useEffect(() => {
    if (filteredSchedules.length === 1) {
      setScheduleId(
        String(filteredSchedules[0].id),
      );
    }
  }, [filteredSchedules]);


  // =======================================================
  // Load attendance
  // =======================================================

  const loadAttendance = async () => {
    if (!date) {
      showMessage(
        "error",
        "Please select date",
      );

      return;
    }

    if (!scheduleId) {
      showMessage(
        "error",
        `Please select schedule for ${selectedDay}`,
      );

      return;
    }

    try {
      setLoadingStudents(true);

      const [
        attendanceResponse,
        permissionResponse,
      ] = await Promise.all([
        api.get(
          `/attendance/schedule/${scheduleId}`,
          {
            params: {
              attendance_date: date,
            },
          },
        ),

        api.get(
          "/permissions/teacher/me",
        ),
      ]);

      const attendanceStudents = Array.isArray(
        attendanceResponse.data.students,
      )
        ? attendanceResponse.data.students
        : [];

      const permissions = Array.isArray(
        permissionResponse.data,
      )
        ? permissionResponse.data
        : [];

      const studentsWithPermission =
        attendanceStudents.map((student) => {
          const permission =
            permissions.find((item) => {
              const sameStudent =
                Number(item.student_id) ===
                Number(student.student_id);

              const sameClass =
                Number(item.class_id) ===
                Number(
                  selectedSchedule?.class_id,
                );

              const validStatus = [
                "pending",
                "approved",
              ].includes(
                String(
                  item.status || "",
                ).toLowerCase(),
              );

              const validDate =
                date >= item.start_date &&
                date <= item.end_date;

              const sameSchedule =
                Number(item.schedule_id) ===
                  Number(scheduleId) ||
                item.schedule_id === null;

              return (
                sameStudent &&
                sameClass &&
                validStatus &&
                validDate &&
                sameSchedule
              );
            });

          if (permission) {
            return {
              ...student,
              status: "L",
              permission_reason:
                permission.reason,
            };
          }

          return {
            ...student,
            status:
              student.status ===
              "Permission"
                ? "L"
                : student.status || "P",

            permission_reason:
              student.permission_reason ||
              "-",
          };
        });

      setStudents(
        studentsWithPermission,
      );

      setLocked(
        Boolean(
          attendanceResponse.data.locked,
        ),
      );

      if (
        attendanceResponse.data.locked
      ) {
        showMessage(
          "warning",
          "Attendance already submitted.",
        );
      }
    } catch (error) {
      console.error(
        "Load attendance error:",
        error,
      );

      setStudents([]);
      setLocked(false);

      showMessage(
        "error",
        error?.response?.data?.detail ||
          "Cannot load attendance",
      );
    } finally {
      setLoadingStudents(false);
    }
  };


  // =======================================================
  // Toggle status
  // =======================================================

  const toggleStatus = (studentId) => {
    if (locked) {
      showMessage(
        "warning",
        "Attendance already saved.",
      );

      return;
    }

    setStudents((previousStudents) =>
      previousStudents.map((student) => {
        if (
          student.student_id !==
          studentId
        ) {
          return student;
        }

        if (
          isPermissionStatus(
            student.status,
          )
        ) {
          showMessage(
            "warning",
            "This student has permission.",
          );

          return student;
        }

        return {
          ...student,
          status:
            student.status === "P"
              ? "A"
              : "P",
        };
      }),
    );
  };


  // =======================================================
  // Save attendance
  // =======================================================

  const saveAttendance = async () => {
    if (locked) {
      showMessage(
        "warning",
        "Attendance already submitted.",
      );

      return;
    }

    if (!scheduleId || !date) {
      showMessage(
        "error",
        "Please select schedule and date",
      );

      return;
    }

    if (students.length === 0) {
      showMessage(
        "error",
        "No students to save",
      );

      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/attendance/save",
        {
          schedule_id:
            Number(scheduleId),

          date,

          items: students.map(
            (student) => ({
              student_id:
                student.student_id,

              status:
                isPermissionStatus(
                  student.status,
                )
                  ? "Permission"
                  : student.status,

              remark:
                student.permission_reason &&
                student.permission_reason !==
                  "-"
                  ? student.permission_reason
                  : null,
            }),
          ),
        },
      );

      setLocked(true);

      showMessage(
        "success",
        "Attendance saved successfully",
      );

      await loadAttendance();
    } catch (error) {
      console.error(
        "Save attendance error:",
        error,
      );

      showMessage(
        "error",
        error?.response?.data?.detail ||
          "Save attendance failed",
      );
    } finally {
      setSaving(false);
    }
  };


  // =======================================================
  // UI
  // =======================================================

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : message.type ===
                  "warning"
                ? "bg-yellow-50 text-yellow-700"
                : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}

          <p className="font-semibold">
            {message.text}
          </p>
        </div>
      )}


      <div className="mb-6 flex items-center gap-3">
        <CalendarCheck className="text-blue-600" />

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Attendance
          </h1>

          <p className="text-sm text-slate-500">
            Showing schedules for{" "}
            <span className="font-semibold text-blue-600">
              {selectedDay || "-"}
            </span>
          </p>
        </div>
      </div>


      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            value={scheduleId}
            onChange={(event) => {
              setScheduleId(
                event.target.value,
              );

              setStudents([]);
              setLocked(false);
            }}
            disabled={
              loadingSchedules ||
              !date ||
              filteredSchedules.length ===
                0
            }
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">
              {loadingSchedules
                ? "Loading schedules..."
                : filteredSchedules.length ===
                    0
                  ? `No schedule for ${selectedDay}`
                  : "Select Schedule"}
            </option>

            {filteredSchedules.map(
              (schedule) => (
                <option
                  key={schedule.id}
                  value={schedule.id}
                >
                  {schedule.class_name} -{" "}
                  {schedule.subject_name} (
                  {schedule.start_time} -{" "}
                  {schedule.end_time})
                </option>
              ),
            )}
          </select>


          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(
                event.target.value,
              );
            }}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          />


          <button
            type="button"
            onClick={loadAttendance}
            disabled={
              loadingStudents ||
              !scheduleId ||
              !date
            }
            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loadingStudents
              ? "Loading..."
              : "Load Students"}
          </button>
        </div>


        {date &&
          filteredSchedules.length ===
            0 &&
          !loadingSchedules && (
            <p className="mt-3 text-sm font-medium text-red-600">
              No schedule found for{" "}
              {selectedDay}.
            </p>
          )}


        {filteredSchedules.length >
          1 && (
          <p className="mt-3 text-sm text-slate-500">
            {filteredSchedules.length}{" "}
            schedules found for{" "}
            {selectedDay}. Please select
            the correct class and time.
          </p>
        )}
      </div>


      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-4 text-left">
                Student
              </th>

              <th className="p-4 text-left">
                Gender
              </th>

              <th className="p-4 text-center">
                Permission Reason
              </th>

              <th className="p-4 text-center">
                Status
              </th>
            </tr>
          </thead>


          <tbody>
            {students.map((student) => (
              <tr
                key={student.student_id}
                className="border-t border-slate-100"
              >
                <td className="p-4 font-medium text-slate-800">
                  {student.student_name}
                </td>

                <td className="p-4 text-slate-600">
                  {student.gender || "-"}
                </td>

                <td className="p-4 text-center text-slate-600">
                  {student.permission_reason ||
                    "-"}
                </td>

                <td className="p-4 text-center">
                  <button
                    type="button"
                    disabled={
                      locked ||
                      isPermissionStatus(
                        student.status,
                      )
                    }
                    onClick={() =>
                      toggleStatus(
                        student.student_id,
                      )
                    }
                    className={`rounded-xl px-6 py-2 font-bold transition ${getStatusClass(
                      student.status,
                    )} ${
                      locked ||
                      isPermissionStatus(
                        student.status,
                      )
                        ? "cursor-not-allowed opacity-70"
                        : "hover:scale-105"
                    }`}
                  >
                    {getStatusLabel(
                      student.status,
                    )}
                  </button>
                </td>
              </tr>
            ))}


            {students.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="p-6 text-center text-slate-500"
                >
                  {!scheduleId
                    ? `Select a schedule for ${selectedDay}`
                    : "Click Load Students"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {students.length > 0 && (
        <button
          type="button"
          onClick={saveAttendance}
          disabled={
            locked ||
            saving
          }
          className={`mt-6 rounded-xl px-6 py-3 font-semibold text-white ${
            locked || saving
              ? "cursor-not-allowed bg-slate-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saving
            ? "Saving..."
            : locked
              ? "Attendance Locked"
              : "Save Attendance"}
        </button>
      )}
    </div>
  );
}