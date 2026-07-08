import { Eye, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageStudents() {
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    api
      .get("/classes/")
      .then((res) => setClasses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClasses([]));
  }, []);

  const viewStudent = async (id) => {
    try {
      const res = await api.get(`/students/${id}`);
      setDetail(res.data);
      setNewPassword("");
    } catch (err) {
      alert(err?.response?.data?.detail || "Cannot load student detail");
    }
  };

  const resetPassword = async () => {
    if (!detail?.id) return;

    try {
      const res = await api.post(`/students/${detail.id}/reset-password`);
      setNewPassword(res.data.temporary_password);
    } catch (err) {
      alert(err?.response?.data?.detail || "Reset password failed");
    }
  };

  const filters = (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          placeholder="Search student name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-600"
        />
      </div>

      <select
        value={classFilter}
        onChange={(e) => setClassFilter(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
      >
        <option value="">All Classes</option>

        {classes.map((cls) => (
          <option key={cls.id} value={`${cls.name} ${cls.section || ""}`}>
            {cls.name} {cls.section || ""}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          setSearch("");
          setClassFilter("");
        }}
        className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50"
      >
        Clear Filter
      </button>
    </div>
  );

  return (
    <>
      <AdminCrudPage
        title="Manage Students"
        endpoint="/students/"
        icon={Users}
        filters={filters}
        search={search}
        classFilter={classFilter}
        filterData={(students) =>
          students.filter((s) => {
            const keyword = search.toLowerCase();

            const matchSearch =
              !keyword ||
              s.student_name?.toLowerCase().includes(keyword) ||
              s.email?.toLowerCase().includes(keyword) ||
              s.student_code?.toLowerCase().includes(keyword);

            const matchClass =
              !classFilter || s.class_name?.trim() === classFilter.trim();

            return matchSearch && matchClass;
          })
        }
        columns={[
          { key: "student_code", label: "ID" },
          { key: "student_name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "class_name", label: "Class" },
          { key: "gender", label: "Gender" },
          { key: "guardian_name", label: "Parent Name" },
          { key: "guardian_phone", label: "Parent Phone" },
        ]}
        fields={[
          { name: "first_name", label: "First Name", required: true },
          { name: "last_name", label: "Last Name", required: true },
          {
            name: "phone",
            label: "Phone Number",
            required: true,
            placeholder: "066968050",
            hint: "System will save as +855 format automatically",
          },
          {
            name: "class_id",
            label: "Class",
            type: "select",
            required: true,
            options: classes.map((cls) => ({
              value: cls.id,
              label: `${cls.name} ${cls.section || ""}`,
            })),
          },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: [
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
            ],
          },
          { name: "guardian_name", label: "Parent Name" },
          { name: "guardian_phone", label: "Parent Phone" },
          {
            name: "address",
            label: "Address",
            type: "textarea",
            fullWidth: true,
          },
        ]}
        extraActions={(item) => (
          <button
            onClick={() => viewStudent(item.id)}
            className="rounded-lg border px-3 py-2 text-blue-600 hover:bg-blue-50"
          >
            <Eye size={16} />
          </button>
        )}
      />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Student Information
              </h2>

              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setNewPassword("");
                }}
              >
                <X />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Student ID" value={detail.student_code} />
              <Info label="Name" value={detail.student_name} />
              <Info label="Email" value={detail.email} />
              <Info label="Class" value={detail.class_name} />
              <Info label="Gender" value={detail.gender} />
              <Info label="Parent Name" value={detail.guardian_name} />
              <Info label="Parent Phone" value={detail.guardian_phone} />
              <Info label="Address" value={detail.address} />
            </div>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-slate-800">Password</p>
                  <p className="text-sm text-slate-500">
                    Old password cannot be viewed. Generate a new temporary
                    password for this student.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetPassword}
                  className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Reset Password
                </button>
              </div>

              {newPassword && (
                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">
                    New Temporary Password
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {newPassword}
                  </p>
                  <p className="mt-2 text-sm text-red-500">
                    Copy this now. It will not be shown again after closing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}