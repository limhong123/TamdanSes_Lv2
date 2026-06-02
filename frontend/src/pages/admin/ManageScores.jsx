import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageScores() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/students/"),
      api.get("/classes/"),
      api.get("/subjects/"),
      api.get("/teachers/"),
    ]).then(([stuRes, clsRes, subRes, teaRes]) => {
      setStudents(stuRes.data);
      setClasses(clsRes.data);
      setSubjects(subRes.data);
      setTeachers(teaRes.data);
    });
  }, []);

  return (
    <AdminCrudPage
      title="Manage Scores"
      endpoint="/scores/"
      icon={FileText}
      columns={[
        { key: "id", label: "ID" },
        { key: "student_name", label: "Student" },
        { key: "class_name", label: "Class" },
        { key: "subject_name", label: "Subject" },
        { key: "teacher_name", label: "Teacher" },
        { key: "exam_type", label: "Exam" },
        { key: "score", label: "Score" },
        { key: "max_score", label: "Max" },
        { key: "remark", label: "Remark" },
      ]}
      fields={[
        {
          name: "student_id",
          label: "Student",
          type: "select",
          required: true,
          options: students.map((s) => ({
            value: s.id,
            label: `${s.student_name} - ${s.class_name}`,
          })),
        },
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
          options: subjects.map((s) => ({
            value: s.id,
            label: s.name,
          })),
        },
        {
          name: "teacher_id",
          label: "Teacher",
          type: "select",
          required: true,
          options: teachers.map((t) => ({
            value: t.id,
            label: t.teacher_name,
          })),
        },
        {
          name: "exam_type",
          label: "Exam Type",
          type: "select",
          required: true,
          options: [
            { value: "Quiz", label: "Quiz" },
            { value: "Midterm", label: "Midterm" },
            { value: "Final", label: "Final" },
            { value: "Homework", label: "Homework" },
          ],
        },
        { name: "score", label: "Score", type: "number", required: true },
        { name: "max_score", label: "Max Score", type: "number", required: true },
        { name: "remark", label: "Remark" },
      ]}
    />
  );
}