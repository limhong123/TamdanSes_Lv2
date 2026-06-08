import { GraduationCap } from "lucide-react";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageTeachers() {
  return (
    <AdminCrudPage
      title="Manage Teachers"
      endpoint="/teachers/"
      icon={GraduationCap}
      columns={[
        { key: "teacher_code", label: "Teacher ID" },
        { key: "teacher_name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address" },
        { key: "qualification", label: "Qualification" },
      ]}
      fields={[
        {
          name: "first_name",
          label: "First Name",
          type: "text",
          required: true,
        },
        {
          name: "last_name",
          label: "Last Name",
          type: "text",
          required: true,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: false,
        },
        {
          name: "phone",
          label: "Phone",
          type: "text",
          required: true,
        },
        {
          name: "address",
          label: "Address",
          type: "text",
          required: true,
        },
        {
          name: "qualification",
          label: "Qualification",
          type: "text",
          required: true,
        },
      ]}
    />
  );
}