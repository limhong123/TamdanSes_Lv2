import { Eye, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageStudents() {
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    api
      .get("/classes/")
      .then((res) => setClasses(res.data))
      .catch(() => setClasses([]));
  }, []);

  const viewStudent = async (id) => {
    try {
      const res = await api.get(`/students/${id}`);
      setDetail(res.data);
    } catch (err) {
      alert(err?.response?.data?.detail || "Cannot load student detail");
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
          placeholder="Search student name or email..."
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
          { key: "guardian_name", label: "Guardian" },
          { key: "guardian_phone", label: "Guardian Phone" },
        ]}
        fields={[
          { name: "first_name", label: "First Name", required: true },
          { name: "last_name", label: "Last Name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          {
            name: "password",
            label: "Password",
            type: "password",
            required: true,
          },
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
          { name: "guardian_name", label: "Guardian Name" },
          { name: "guardian_phone", label: "Guardian Phone" },
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

              <button onClick={() => setDetail(null)}>
                <X />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Student ID" value={detail.student_code} />
              <Info label="Name" value={detail.student_name} />
              <Info label="Email" value={detail.email} />
              <Info label="Class" value={detail.class_name} />
              <Info label="Gender" value={detail.gender} />
              <Info label="Guardian Name" value={detail.guardian_name} />
              <Info label="Guardian Phone" value={detail.guardian_phone} />
              <Info label="Address" value={detail.address} />
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