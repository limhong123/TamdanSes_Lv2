import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function StudentLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="student" />

      <main className="ml-64">
        <Navbar title="Student Portal" />
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}