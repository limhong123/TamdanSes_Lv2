import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);

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
            createdAt: item.created_at || "-",
          }))
        );
      })
      .catch(() => setNotifications([]));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Bell className="text-blue-600" />

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Notifications
          </h1>

          <p className="text-sm text-slate-500">
            School announcements
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-800">
              {item.title}
            </h2>

            <p className="mt-2 text-slate-600">
              {item.message}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              {item.createdAt}
            </p>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
}