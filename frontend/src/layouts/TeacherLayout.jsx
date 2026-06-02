import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function TeacherLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="teacher" />
      <main className="ml-64">
        <Navbar title="Teacher Portal" />
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
