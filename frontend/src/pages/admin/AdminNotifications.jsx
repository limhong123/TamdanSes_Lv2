import { Bell } from "lucide-react";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function AdminNotifications() {
  return (
    <AdminCrudPage
      title="Admin Notifications"
      endpoint="/notifications"
      icon={Bell}
      columns={[
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "message", label: "Message" },
      ]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "message", label: "Message", required: true },
      ]}
    />
  );
}