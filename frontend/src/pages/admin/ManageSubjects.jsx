import { FileText } from "lucide-react";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageSubjects() {
  return (
    <AdminCrudPage
      title="Manage Subjects"
      endpoint="/subjects/"
      icon={FileText}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Subject Name" },
        { key: "code", label: "Code" },
      ]}
      fields={[
        { name: "name", label: "Subject Name", required: true },
        { name: "code", label: "Code", required: true },
      ]}
    />
  );
}