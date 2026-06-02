import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageSchedules() {
  const [classes, setClasses] = useState([]);
  const [relations, setRelations] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/classes/"),
      api.get("/class-teachers/"),
    ])
      .then(([classRes, relationRes]) => {
        setClasses(classRes.data);
        setRelations(relationRes.data);
      })
      .catch(() => {
        setClasses([]);
        setRelations([]);
      });
  }, []);

  const getSubjectsByClass = (form) => {
    if (!form.class_id) return [];

    const filtered = relations.filter(
      (r) => Number(r.class_id) === Number(form.class_id)
    );

    const unique = [];

    filtered.forEach((r) => {
      if (!unique.find((s) => s.value === r.subject_id)) {
        unique.push({
          value: r.subject_id,
          label: r.subject_name,
        });
      }
    });

    return unique;
  };

  const getTeachersByClassAndSubject = (form) => {
    if (!form.class_id || !form.subject_id) return [];

    return relations
      .filter(
        (r) =>
          Number(r.class_id) === Number(form.class_id) &&
          Number(r.subject_id) === Number(form.subject_id)
      )
      .map((r) => ({
        value: r.teacher_id,
        label: r.teacher_name,
      }));
  };

  return (
    <AdminCrudPage
      title="Manage Schedules"
      endpoint="/schedules/"
      icon={CalendarDays}
      columns={[
        { key: "id", label: "ID" },
        { key: "class_name", label: "Class" },
        { key: "subject_name", label: "Subject" },
        { key: "teacher_name", label: "Teacher" },
        { key: "day", label: "Day" },
        { key: "start_time", label: "Start" },
        { key: "end_time", label: "End" },
      ]}
      fields={[
        {
          name: "class_id",
          label: "Class",
          type: "select",
          required: true,
          options: classes.map((c) => ({
            value: c.id,
            label: `${c.name} ${c.section || ""}`,
          })),
        },
        {
          name: "subject_id",
          label: "Subject",
          type: "select",
          required: true,
          options: getSubjectsByClass,
        },
        {
          name: "teacher_id",
          label: "Teacher",
          type: "select",
          required: true,
          options: getTeachersByClassAndSubject,
        },
        {
          name: "day",
          label: "Day",
          type: "select",
          required: true,
          options: [
            { value: "Monday", label: "Monday" },
            { value: "Tuesday", label: "Tuesday" },
            { value: "Wednesday", label: "Wednesday" },
            { value: "Thursday", label: "Thursday" },
            { value: "Friday", label: "Friday" },
            { value: "Saturday", label: "Saturday" },
            { value: "Sunday", label: "Sunday" },
          ],
        },
        { name: "start_time", label: "Start Time", type: "time", required: true },
        { name: "end_time", label: "End Time", type: "time", required: true },
      ]}
    />
  );
}