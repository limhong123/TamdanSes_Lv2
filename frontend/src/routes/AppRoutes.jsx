import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";

import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import RegisterAdmin from "./pages/auth/RegisterAdmin"; 

import AdminLayout from "../layouts/AdminLayout";
import StudentLayout from "../layouts/StudentLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import AdminProfile from "../pages/admin/AdminProfile";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminNotifications from "../pages/admin/AdminNotifications";
import ClassTeachers from "../pages/admin/ClassTeachers";
import ManageClasses from "../pages/admin/ManageClasses";
import ManageEvents from "../pages/admin/ManageEvents";
import ManageHolidays from "../pages/admin/ManageHolidays";
import ManageSchedules from "../pages/admin/ManageSchedules";
import ManageStudents from "../pages/admin/ManageStudents";
import ManageSubjects from "../pages/admin/ManageSubjects";
import ManageTeachers from "../pages/admin/ManageTeachers";



import StudentPermission from "../pages/student/StudentPermission";
import TeacherPermissions from "../pages/teacher/TeacherPermissions";
import StudentAttendance from "../pages/student/StudentAttendance";
import StudentDashboard from "../pages/student/StudentDashboard";
import StudentHomework from "../pages/student/StudentHomework";
import StudentNotifications from "../pages/student/StudentNotifications";
import StudentProfile from "../pages/student/StudentProfile";
import StudentResult from "../pages/student/StudentResult";
import StudentSchedules from "../pages/student/StudentSchedules";
import StudentScores from "../pages/student/StudentScores";
import TeacherSchedules from "../pages/teacher/TeacherSchedules";

import TeacherAttendance from "../pages/teacher/TeacherAttendance";
import TeacherClasses from "../pages/teacher/TeacherClasses";
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherHomework from "../pages/teacher/TeacherHomework";
import TeacherNotifications from "../pages/teacher/TeacherNotifications";
import TeacherProfile from "../pages/teacher/TeacherProfile";
import TeacherScores from "../pages/teacher/TeacherScores";

export default function AppRoutes() {
  return (
    <Routes>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register-admin" element={<RegisterAdmin />} />
      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/class-teachers"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ClassTeachers />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <AdminProfile />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageStudents />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      

      <Route
        path="/admin/teachers"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageTeachers />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/classes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageClasses />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/subjects"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageSubjects />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/schedules"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageSchedules />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/events"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageEvents />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/holidays"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <ManageHolidays />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout>
              <AdminNotifications />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentDashboard />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/result"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentResult />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/attendance"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentAttendance />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
  path="/student/permission"
  element={
    <ProtectedRoute roles={["student"]}>
      <StudentLayout>
        <StudentPermission />
      </StudentLayout>
    </ProtectedRoute>
  }
/>
      <Route
        path="/student/homework"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentHomework />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/schedules"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentSchedules />
            </StudentLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/notifications"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentNotifications />
            </StudentLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/profile"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentProfile />
            </StudentLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/scores"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout>
              <StudentScores />
            </StudentLayout>
          </ProtectedRoute>
        }
      />

      {/* Teacher */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherDashboard />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherClasses />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/attendance"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherAttendance />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />
<Route
  path="/teacher/permissions"
  element={
    <ProtectedRoute roles={["teacher"]}>
      <TeacherLayout>
        <TeacherPermissions />
      </TeacherLayout>
    </ProtectedRoute>
  }
/>
      <Route
        path="/teacher/homework"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherHomework />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/schedules"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherSchedules />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/notifications"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherNotifications />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/profile"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherProfile />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/scores"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout>
              <TeacherScores />
            </TeacherLayout>
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}