import { Eye, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageStudents() {
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);

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

  return (
    <>
      <AdminCrudPage
        title="Manage Students"
        endpoint="/students/"
        icon={Users}
        columns={[
          { key: "id", label: "ID" },
          { key: "student_name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "class_name", label: "Class" },
          { key: "gender", label: "Gender" },
          { key: "guardian_name", label: "Guardian" },
          { key: "guardian_phone", label: "Phone" },
          { key: "address", label: "Address" },
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
          { name: "address", label: "Address" },
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
              <Info label="Name" value={detail.student_name} />
              <Info label="Email" value={detail.email} />
              <Info label="Class" value={detail.class_name} />
              <Info label="Gender" value={detail.gender} />
              <Info label="Guardian Name" value={detail.guardian_name} />
              <Info label="Guardian Phone" value={detail.guardian_phone} />
              <Info label="Address" value={detail.address} />
              <Info label="Student ID" value={detail.id} />
              <Info label="User ID" value={detail.user_id} />
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