import {
  CalendarCheck,
  CheckCircle,
  QrCode,
  RefreshCw,
  Square,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import api from "../../api/axios";


// ============================================================
// LOCAL DATE
// ============================================================

const getLocalDateString = () => {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


// ============================================================
// QR EXPIRY
// ============================================================

const parseExpiryTime = (
  value
) => {
  if (!value) {
    return 0;
  }

  const text =
    String(
      value
    ).trim();

  const hasTimezone =
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(
      text
    );

  const normalized =
    hasTimezone
      ? text
      : `${text}Z`;

  return new Date(
    normalized
  ).getTime();
};


// ============================================================
// COMPONENT
// ============================================================

export default function TeacherAttendance() {

  const today =
    getLocalDateString();


  // ==========================================================
  // STATE
  // ==========================================================

  const [
    schedules,
    setSchedules,
  ] = useState([]);

  const [
    scheduleId,
    setScheduleId,
  ] = useState("");

  const [
    date,
    setDate,
  ] = useState(today);

  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    loadingSchedules,
    setLoadingSchedules,
  ] = useState(false);

  const [
    loadingStudents,
    setLoadingStudents,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState(null);


  // ==========================================================
  // SAVE STATE
  // ==========================================================

  const [
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ] = useState(false);


  // ==========================================================
  // QR STATE
  // ==========================================================

  const [
    qrSession,
    setQrSession,
  ] = useState(null);

  const [
    qrLoading,
    setQrLoading,
  ] = useState(false);

  const [
    qrSeconds,
    setQrSeconds,
  ] = useState(0);


  // ==========================================================
  // SELECTED DAY
  // ==========================================================

  const selectedDay =
    useMemo(
      () => {

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

        const selectedDate =
          new Date(
            `${date}T00:00:00`
          );

        return dayNames[
          selectedDate.getDay()
        ];

      },
      [
        date,
      ]
    );


  // ==========================================================
  // FILTER SCHEDULES
  // ==========================================================

  const filteredSchedules =
    useMemo(
      () => {

        if (!selectedDay) {
          return [];
        }

        return schedules.filter(
          (
            schedule
          ) => {

            const scheduleDay =
              String(
                schedule.day ||
                ""
              )
                .trim()
                .toLowerCase();

            return (
              scheduleDay ===
              selectedDay
                .toLowerCase()
            );
          }
        );

      },
      [
        schedules,
        selectedDay,
      ]
    );


  // ==========================================================
  // MESSAGE
  // ==========================================================

  const showMessage = (
    type,
    text
  ) => {

    setMessage({
      type,
      text,
    });

    window.setTimeout(
      () => {
        setMessage(null);
      },
      3000
    );
  };


  // ==========================================================
  // STATUS LABEL
  // ==========================================================

  const getStatusLabel = (
    status
  ) => {

    const normalized =
      String(
        status || ""
      )
        .trim()
        .toLowerCase();

    if (
      normalized === "p" ||
      normalized === "present"
    ) {
      return "Present";
    }

    if (
      normalized === "a" ||
      normalized === "absent"
    ) {
      return "Absent";
    }

    if (
      normalized === "l" ||
      normalized === "permission"
    ) {
      return "Permission";
    }

    if (
      normalized === "e" ||
      normalized === "excused"
    ) {
      return "Excused";
    }

    return "-";
  };


  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusClass = (
    status
  ) => {

    const label =
      getStatusLabel(
        status
      );

    if (
      label ===
      "Present"
    ) {
      return (
        "bg-green-100 " +
        "text-green-700"
      );
    }

    if (
      label ===
      "Absent"
    ) {
      return (
        "bg-red-100 " +
        "text-red-700"
      );
    }

    if (
      label ===
      "Permission"
    ) {
      return (
        "bg-yellow-100 " +
        "text-yellow-700"
      );
    }

    if (
      label ===
      "Excused"
    ) {
      return (
        "bg-blue-100 " +
        "text-blue-700"
      );
    }

    return (
      "bg-slate-100 " +
      "text-slate-700"
    );
  };


  // ==========================================================
  // PERMISSION STATUS
  // ==========================================================

  const isPermissionStatus = (
    status
  ) => {

    const normalized =
      String(
        status || ""
      )
        .trim()
        .toLowerCase();

    return (
      normalized === "l" ||
      normalized ===
        "permission"
    );
  };


  // ==========================================================
  // LOAD SCHEDULES
  // ==========================================================

  useEffect(
    () => {

      const loadSchedules =
        async () => {

          try {

            setLoadingSchedules(
              true
            );

            const response =
              await api.get(
                "/schedules/teacher/me"
              );

            setSchedules(
              Array.isArray(
                response.data
              )
                ? response.data
                : []
            );

          } catch (
            error
          ) {

            console.error(
              "Load schedule error:",
              error
            );

            setSchedules([]);

            showMessage(
              "error",
              error
                ?.response
                ?.data
                ?.detail ||
              "Cannot load schedules"
            );

          } finally {

            setLoadingSchedules(
              false
            );
          }
        };

      loadSchedules();

    },
    []
  );


  // ==========================================================
  // DATE CHANGE
  // ==========================================================

  useEffect(
    () => {

      setScheduleId("");

      setStudents([]);

      setQrSession(
        null
      );

      setQrSeconds(
        0
      );

      setHasUnsavedChanges(
        false
      );

    },
    [
      date,
    ]
  );


  // ==========================================================
  // AUTO SELECT ONE SCHEDULE
  // ==========================================================

  useEffect(
    () => {

      if (
        filteredSchedules
          .length ===
        1
      ) {

        setScheduleId(
          String(
            filteredSchedules[
              0
            ].id
          )
        );
      }

    },
    [
      filteredSchedules,
    ]
  );


  // ==========================================================
  // LOAD ATTENDANCE
  // ==========================================================

  const loadAttendance =
    async () => {

      if (!date) {

        showMessage(
          "error",
          "Please select date"
        );

        return;
      }


      if (!scheduleId) {

        showMessage(
          "error",
          `Please select schedule for ${selectedDay}`
        );

        return;
      }


      try {

        setLoadingStudents(
          true
        );


        const response =
          await api.get(
            `/attendance/schedule/${scheduleId}`,
            {
              params: {
                attendance_date:
                  date,
              },
            }
          );


        const attendanceStudents =
          Array.isArray(
            response.data
              ?.students
          )
            ? response.data
                .students
            : [];


        const normalizedStudents =
          attendanceStudents.map(
            (
              student
            ) => {

              const normalizedStatus =
                String(
                  student.status ||
                  ""
                )
                  .trim()
                  .toLowerCase();


              // ===============================================
              // DEFAULT = PRESENT
              // ===============================================

              let status =
                student.status ||
                "P";


              if (
                normalizedStatus ===
                "permission"
              ) {

                status =
                  "L";
              }


              return {
                ...student,

                status:
                  status ||
                  "P",

                permission_reason:
                  student
                    .permission_reason ||
                  student.remark ||
                  "-",

                scanned:
                  Boolean(
                    student.scanned
                  ),

                has_attendance:
                  Boolean(
                    student
                      .has_attendance
                  ),
              };
            }
          );


        setStudents(
          normalizedStudents
        );


        // ===============================================
        // If all students already have database records,
        // Save button stays disabled.
        //
        // If new attendance:
        // students have default Present
        // and teacher should be able to Save.
        // ===============================================

        const allStudentsSaved =
          response.data
            ?.all_students_saved ===
          true;


        setHasUnsavedChanges(
          normalizedStudents
            .length > 0 &&
          !allStudentsSaved
        );


      } catch (
        error
      ) {

        console.error(
          "Load attendance error:",
          error
        );


        setStudents([]);

        setHasUnsavedChanges(
          false
        );


        showMessage(
          "error",
          error
            ?.response
            ?.data
            ?.detail ||
          "Cannot load attendance"
        );


      } finally {

        setLoadingStudents(
          false
        );
      }
    };


  // ==========================================================
  // TOGGLE PRESENT / ABSENT
  // ==========================================================

  const toggleStatus = (
    studentId
  ) => {

    let changed =
      false;


    setStudents(
      (
        previousStudents
      ) =>
        previousStudents.map(
          (
            student
          ) => {

            if (
              student
                .student_id !==
              studentId
            ) {

              return student;
            }


            // ===============================================
            // QR confirmed
            // ===============================================

            if (
              student.scanned
            ) {

              showMessage(
                "warning",
                "This student already scanned QR and is confirmed Present."
              );

              return student;
            }


            // ===============================================
            // Permission
            // ===============================================

            if (
              isPermissionStatus(
                student.status
              )
            ) {

              showMessage(
                "warning",
                "This student has permission."
              );

              return student;
            }


            changed =
              true;


            // ===============================================
            // Present <-> Absent
            // ===============================================

            return {
              ...student,

              status:
                student.status ===
                "P"
                  ? "A"
                  : "P",
            };
          }
        )
    );


    if (
      changed
    ) {

      setHasUnsavedChanges(
        true
      );
    }
  };


  // ==========================================================
  // SAVE ATTENDANCE
  // ==========================================================

  const saveAttendance =
    async () => {

      if (
        !scheduleId ||
        !date
      ) {

        showMessage(
          "error",
          "Please select schedule and date"
        );

        return;
      }


      if (
        students.length ===
        0
      ) {

        showMessage(
          "error",
          "No students to save"
        );

        return;
      }


      if (
        !hasUnsavedChanges
      ) {

        showMessage(
          "success",
          "Attendance is already saved"
        );

        return;
      }


      try {

        setSaving(
          true
        );


        const items =
          students.map(
            (
              student
            ) => {

              let status =
                student.status;


              // Permission frontend L
              // -> backend Permission

              if (
                isPermissionStatus(
                  student.status
                )
              ) {

                status =
                  "Permission";
              }


              let remark =
                null;


              // QR confirmation
              if (
                student.scanned
              ) {

                remark =
                  "QR Scan";

              } else if (
                student
                  .permission_reason &&
                student
                  .permission_reason !==
                "-"
              ) {

                remark =
                  student
                    .permission_reason;
              }


              return {
                student_id:
                  student
                    .student_id,

                status,

                remark,
              };
            }
          );


        await api.post(
          "/attendance/save",
          {
            schedule_id:
              Number(
                scheduleId
              ),

            date,

            items,
          }
        );


        setHasUnsavedChanges(
          false
        );


        showMessage(
          "success",
          "Attendance saved successfully"
        );


        await loadAttendance();


      } catch (
        error
      ) {

        console.error(
          "Save attendance error:",
          error
        );


        showMessage(
          "error",
          error
            ?.response
            ?.data
            ?.detail ||
          "Save attendance failed"
        );


      } finally {

        setSaving(
          false
        );
      }
    };


  // ==========================================================
  // GENERATE QR
  // ==========================================================

  const generateQr =
    async () => {

      if (
        !scheduleId
      ) {

        showMessage(
          "error",
          "Please select schedule"
        );

        return;
      }


      try {

        setQrLoading(
          true
        );


        const response =
          await api.post(
            "/attendance/scan-session",
            {
              schedule_id:
                Number(
                  scheduleId
                ),
            }
          );


        setQrSession(
          response.data
        );


        setQrSeconds(
          Number(
            response.data
              ?.expires_in_seconds ||
            600
          )
        );


        showMessage(
          "success",
          "QR attendance started"
        );


        await loadAttendance();


      } catch (
        error
      ) {

        console.error(
          "Generate QR error:",
          error
        );


        showMessage(
          "error",
          error
            ?.response
            ?.data
            ?.detail ||
          "Cannot generate QR"
        );


      } finally {

        setQrLoading(
          false
        );
      }
    };


  // ==========================================================
  // CLOSE QR
  // ==========================================================

  const closeQr =
    async () => {

      if (
        !qrSession
          ?.session_id
      ) {

        return;
      }


      try {

        await api.post(
          `/attendance/scan-session/${qrSession.session_id}/close`
        );


        setQrSession(
          null
        );

        setQrSeconds(
          0
        );


        showMessage(
          "success",
          "QR attendance closed"
        );


        await loadAttendance();


      } catch (
        error
      ) {

        console.error(
          "Close QR error:",
          error
        );


        showMessage(
          "error",
          error
            ?.response
            ?.data
            ?.detail ||
          "Cannot close QR"
        );
      }
    };


  // ==========================================================
  // COUNTDOWN
  // ==========================================================

  useEffect(
    () => {

      if (
        !qrSession
          ?.expires_at
      ) {

        setQrSeconds(
          0
        );

        return;
      }


      const updateCountdown =
        () => {

          const expires =
            parseExpiryTime(
              qrSession
                .expires_at
            );


          const now =
            Date.now();


          const seconds =
            Math.max(
              0,

              Math.ceil(
                (
                  expires -
                  now
                ) /
                1000
              )
            );


          setQrSeconds(
            seconds
          );


          if (
            seconds <=
            0
          ) {

            setQrSession(
              null
            );
          }
        };


      updateCountdown();


      const timer =
        window.setInterval(
          updateCountdown,
          1000
        );


      return () => {

        window.clearInterval(
          timer
        );
      };

    },
    [
      qrSession
        ?.expires_at,
    ]
  );


  // ==========================================================
  // COUNTDOWN FORMAT
  // ==========================================================

  const formatCountdown = (
    seconds
  ) => {

    const minutes =
      Math.floor(
        seconds /
        60
      );


    const remainingSeconds =
      seconds %
      60;


    return (
      `${minutes}:` +
      `${String(
        remainingSeconds
      ).padStart(
        2,
        "0"
      )}`
    );
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div>


      {/* =====================================================
          MESSAGE
      ====================================================== */}

      {message && (

        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-lg ${
            message.type ===
            "success"
              ? "bg-green-50 text-green-700"

              : message.type ===
                "warning"
                ? "bg-yellow-50 text-yellow-700"

                : "bg-red-50 text-red-700"
          }`}
        >

          {message.type ===
          "success" ? (

            <CheckCircle
              size={20}
            />

          ) : (

            <XCircle
              size={20}
            />
          )}


          <p className="font-semibold">
            {message.text}
          </p>

        </div>
      )}


      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-6 flex items-center gap-3">

        <CalendarCheck
          className="text-blue-600"
        />


        <div>

          <h1 className="text-2xl font-bold text-slate-800">
            Attendance
          </h1>


          <p className="text-sm text-slate-500">

            Showing schedules for{" "}

            <span className="font-semibold text-blue-600">

              {selectedDay ||
                "-"}

            </span>

          </p>

        </div>

      </div>


      {/* =====================================================
          FILTER
      ====================================================== */}

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">


          {/* SCHEDULE */}

          <select

            value={
              scheduleId
            }

            onChange={(
              event
            ) => {

              setScheduleId(
                event
                  .target
                  .value
              );

              setStudents(
                []
              );

              setQrSession(
                null
              );

              setQrSeconds(
                0
              );

              setHasUnsavedChanges(
                false
              );
            }}

            disabled={
              loadingSchedules ||
              !date ||
              filteredSchedules
                .length ===
                0
            }

            className="
              rounded-xl
              border
              border-slate-300
              px-4
              py-3
              outline-none
              focus:border-blue-600
              disabled:cursor-not-allowed
              disabled:bg-slate-100
            "
          >

            <option value="">

              {
                loadingSchedules
                  ? "Loading schedules..."

                  : filteredSchedules
                      .length ===
                    0
                    ? `No schedule for ${selectedDay}`

                    : "Select Schedule"
              }

            </option>


            {
              filteredSchedules.map(
                (
                  schedule
                ) => (

                  <option
                    key={
                      schedule.id
                    }

                    value={
                      schedule.id
                    }
                  >

                    {
                      schedule
                        .class_name
                    }

                    {" - "}

                    {
                      schedule
                        .subject_name
                    }

                    {" ("}

                    {
                      schedule
                        .start_time
                    }

                    {" - "}

                    {
                      schedule
                        .end_time
                    }

                    {")"}

                  </option>
                )
              )
            }

          </select>


          {/* DATE */}

          <input

            type="date"

            value={
              date
            }

            onChange={(
              event
            ) => {

              setDate(
                event
                  .target
                  .value
              );
            }}

            className="
              rounded-xl
              border
              border-slate-300
              px-4
              py-3
              outline-none
              focus:border-blue-600
            "
          />


          {/* LOAD */}

          <button

            type="button"

            onClick={
              loadAttendance
            }

            disabled={
              loadingStudents ||
              !scheduleId ||
              !date
            }

            className="
              rounded-xl
              bg-blue-600
              px-4
              py-3
              font-semibold
              text-white
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:bg-slate-400
            "
          >

            {
              loadingStudents
                ? "Loading..."
                : "Load Students"
            }

          </button>

        </div>


        {
          date &&
          filteredSchedules
            .length ===
            0 &&
          !loadingSchedules && (

            <p className="mt-3 text-sm font-medium text-red-600">

              No schedule found for{" "}
              {selectedDay}.

            </p>
          )
        }

      </div>


      {/* =====================================================
          QR ATTENDANCE
      ====================================================== */}

      {
        scheduleId && (

          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">


              <div>

                <div className="flex items-center gap-2">

                  <QrCode
                    size={22}
                    className="text-blue-600"
                  />


                  <h2 className="text-lg font-bold text-slate-800">

                    QR Attendance

                  </h2>

                </div>


                <p className="mt-1 text-sm text-slate-500">

                  Students can scan
                  this QR to confirm
                  their attendance.

                </p>

              </div>


              {
                !qrSession && (

                  <button

                    type="button"

                    onClick={
                      generateQr
                    }

                    disabled={
                      qrLoading
                    }

                    className="
                      rounded-xl
                      bg-blue-600
                      px-5
                      py-3
                      font-semibold
                      text-white
                      hover:bg-blue-700
                      disabled:bg-slate-400
                    "
                  >

                    {
                      qrLoading
                        ? "Generating..."
                        : "Generate QR"
                    }

                  </button>
                )
              }

            </div>


            {
              qrSession && (

                <div className="mt-6">


                  <div className="flex flex-col items-center">


                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

                      <QRCodeSVG

                        value={
                          qrSession
                            .token
                        }

                        size={
                          220
                        }

                        level="H"

                      />

                    </div>


                    <div className="mt-4 text-center">

                      <p className="text-sm text-slate-500">

                        QR expires in

                      </p>


                      <p
                        className={`mt-1 text-3xl font-bold ${
                          qrSeconds <=
                          30
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >

                        {
                          formatCountdown(
                            qrSeconds
                          )
                        }

                      </p>

                    </div>


                    <div className="mt-5 flex flex-wrap justify-center gap-3">


                      {/* REFRESH */}

                      <button

                        type="button"

                        onClick={
                          loadAttendance
                        }

                        disabled={
                          loadingStudents
                        }

                        className="
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          bg-green-600
                          px-4
                          py-2.5
                          font-semibold
                          text-white
                          hover:bg-green-700
                          disabled:bg-slate-400
                        "
                      >

                        <RefreshCw
                          size={17}
                        />

                        Refresh Students

                      </button>


                      {/* NEW QR */}

                      <button

                        type="button"

                        onClick={
                          generateQr
                        }

                        disabled={
                          qrLoading
                        }

                        className="
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          bg-blue-600
                          px-4
                          py-2.5
                          font-semibold
                          text-white
                          hover:bg-blue-700
                          disabled:bg-slate-400
                        "
                      >

                        <QrCode
                          size={17}
                        />

                        New QR

                      </button>


                      {/* CLOSE QR */}

                      <button

                        type="button"

                        onClick={
                          closeQr
                        }

                        className="
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          bg-red-600
                          px-4
                          py-2.5
                          font-semibold
                          text-white
                          hover:bg-red-700
                        "
                      >

                        <Square
                          size={16}
                        />

                        Close QR

                      </button>

                    </div>

                  </div>

                </div>
              )
            }

          </div>
        )
      }


      {/* =====================================================
          STUDENT TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">


        <div className="overflow-x-auto">


          <table className="w-full min-w-[750px] text-sm">


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


              {
                students.map(
                  (
                    student
                  ) => (

                    <tr

                      key={
                        student
                          .student_id
                      }

                      className="
                        border-t
                        border-slate-100
                      "
                    >


                      {/* STUDENT */}

                      <td className="p-4">

                        <div className="flex flex-wrap items-center gap-2">


                          <span className="font-medium text-slate-800">

                            {
                              student
                                .student_name
                            }

                          </span>


                          {
                            student
                              .scanned && (

                              <span className="rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-700">

                                ✓ QR Confirmed

                              </span>
                            )
                          }

                        </div>

                      </td>


                      {/* GENDER */}

                      <td className="p-4 text-slate-600">

                        {
                          student
                            .gender ||
                          "-"
                        }

                      </td>


                      {/* PERMISSION */}

                      <td className="p-4 text-center text-slate-600">

                        {
                          student
                            .permission_reason ||
                          "-"
                        }

                      </td>


                      {/* STATUS */}

                      <td className="p-4 text-center">


                        <button

                          type="button"

                          disabled={
                            student
                              .scanned ||
                            isPermissionStatus(
                              student
                                .status
                            )
                          }

                          onClick={
                            () =>
                              toggleStatus(
                                student
                                  .student_id
                              )
                          }

                          className={`rounded-xl px-6 py-2 font-bold transition ${getStatusClass(
                            student.status
                          )} ${
                            student.scanned ||
                            isPermissionStatus(
                              student.status
                            )
                              ? "cursor-not-allowed opacity-70"
                              : "hover:scale-105"
                          }`}
                        >

                          {
                            student
                              .scanned

                              ? "Present ✓"

                              : getStatusLabel(
                                  student
                                    .status
                                )
                          }

                        </button>

                      </td>

                    </tr>
                  )
                )
              }


              {
                students.length ===
                  0 && (

                  <tr>

                    <td
                      colSpan="4"
                      className="p-8 text-center text-slate-500"
                    >

                      {
                        !scheduleId
                          ? `Select a schedule for ${selectedDay}`

                          : "Click Load Students"
                      }

                    </td>

                  </tr>
                )
              }

            </tbody>

          </table>

        </div>

      </div>


      {/* =====================================================
          SAVE
      ====================================================== */}

      {
        students.length >
          0 && (

          <div className="mt-6 flex flex-wrap items-center gap-4">


            <button

              type="button"

              onClick={
                saveAttendance
              }

              disabled={
                saving ||
                !hasUnsavedChanges
              }

              className={`rounded-xl px-6 py-3 font-semibold text-white transition ${
                saving ||
                !hasUnsavedChanges

                  ? "cursor-not-allowed bg-slate-400"

                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >

              {
                saving
                  ? "Saving..."

                  : !hasUnsavedChanges
                    ? "Attendance Saved ✓"

                    : "Save Attendance"
              }

            </button>


            {
              hasUnsavedChanges && (

                <span className="text-sm font-medium text-orange-600">

                  Unsaved changes

                </span>
              )
            }


            {
              !hasUnsavedChanges &&
              !saving && (

                <span className="flex items-center gap-1 text-sm font-medium text-green-600">

                  <CheckCircle
                    size={16}
                  />

                  Saved

                </span>
              )
            }

          </div>
        )
      }

    </div>
  );
}