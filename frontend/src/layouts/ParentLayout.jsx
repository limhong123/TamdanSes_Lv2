import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function ParentLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="parent" />

      <main className="ml-64">
        <Navbar title="Parent Portal" />

        <section className="p-6">
          {children}
        </section>
      </main>
    </div>
  );
}