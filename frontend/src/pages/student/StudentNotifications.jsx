import {
  Bell,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  Clock,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const getNotificationIcon = (title = "") => {
    const text = title.toLowerCase();

    if (text.includes("homework")) return BookOpen;
    if (text.includes("attendance")) return CalendarCheck;
    if (text.includes("permission")) return ClipboardCheck;
    if (text.includes("score") || text.includes("result")) return BarChart3;
    if (text.includes("event")) return Megaphone;

    return Bell;
  };

  useEffect(() => {
    localStorage.setItem("unread_notifications", "false");

    api
      .get("/notifications")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];

        setNotifications(
          list.map((item) => ({
            id: item.id,
            title: item.title || "Untitled",
            message: item.message || "No message",
            createdAt: item.created_at || "",
          }))
        );
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/20 p-3">
            <Bell size={28} />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="mt-1 text-sm text-blue-100">
              School announcements and event alerts
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Bell size={30} />
          </div>

          <h2 className="text-lg font-bold text-slate-800">
            No notifications yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            New school announcements will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => {
            const Icon = getNotificationIcon(item.title);

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon size={24} />
                  </div>

                  <div className="flex-1">
                    <h2 className="text-base font-bold text-slate-800">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>

                    {item.createdAt && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} />
                        <span>
                          {new Date(item.createdAt).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}