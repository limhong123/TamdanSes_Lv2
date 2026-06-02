import { CalendarCheck } from "lucide-react";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageHolidays() {
  return (
    <AdminCrudPage
      title="Manage Holidays"
      endpoint="/holidays"
      icon={CalendarCheck}
      columns={[
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "date", label: "Date" },
        { key: "description", label: "Description" },
      ]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "date", label: "Date", type: "date" },
        { name: "description", label: "Description" },
      ]}
    />
  );
}