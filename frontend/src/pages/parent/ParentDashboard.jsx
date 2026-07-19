export default function ParentDashboard() {
  const parentName =
    localStorage.getItem("full_name") || "Parent";

  const students = JSON.parse(
    localStorage.getItem("parent_students") || "[]",
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {parentName}
          </h1>

          <p className="mt-2 text-slate-500">
            Select a child to view school information.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {students.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 shadow">
              <p className="text-slate-500">
                No students were found for this parent.
              </p>
            </div>
          ) : (
            students.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => {
                  localStorage.setItem(
                    "selected_student_id",
                    String(student.id),
                  );

                  localStorage.setItem(
                    "student_id",
                    String(student.id),
                  );

                  localStorage.setItem(
                    "selected_student_code",
                    student.student_code || "",
                  );

                  localStorage.setItem(
                    "student_code",
                    student.student_code || "",
                  );

                  localStorage.setItem(
                    "class_id",
                    String(student.class_id || ""),
                  );
                }}
                className="rounded-3xl bg-white p-6 text-left shadow transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold text-slate-900">
                  {student.student_name || "Student"}
                </h2>

                <p className="mt-2 text-slate-500">
                  Student ID: {student.student_code}
                </p>

                <p className="mt-1 text-slate-500">
                  Class ID: {student.class_id || "-"}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}