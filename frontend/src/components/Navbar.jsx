import { Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Navbar({ title = "School Management System" }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <Menu className="h-5 w-5 text-slate-600" />
        <h1 className="font-semibold text-slate-800">{title}</h1>
      </div>
      
    </header>
  );
}
