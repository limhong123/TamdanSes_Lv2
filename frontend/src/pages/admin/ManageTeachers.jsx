import { GraduationCap } from "lucide-react";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageTeachers() {
  return (
    <AdminCrudPage
      title="Manage Teachers"
      endpoint="/teachers/"
      icon={GraduationCap}
      columns={[
        { key: "id", label: "ID" },
        { key: "teacher_name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address" },
        { key: "qualification", label: "Qualification" },
      ]}
      fields={[
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Password", type: "password", required: true },
        { name: "phone", label: "Phone" },
        { name: "address", label: "Address" },
        { name: "qualification", label: "Qualification" },
      ]}
    />
  );
}