import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <main className="ml-64">
        <Navbar title="Admin Panel" />
        <section className="p-6">{children}</section>
      </main>
    </div>
  );
}
