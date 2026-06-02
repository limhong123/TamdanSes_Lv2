import { Bell, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherNotifications() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    localStorage.setItem("unread_notifications", "false");

    api
      .get("/events/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];

        setEvents(
          list.map((event) => ({
            id: event.id,
            title: event.title || "Untitled Event",
            date: event.date || event.event_date || "-",
            description: event.description || "No description",
          }))
        );
      })
      .catch(() => setEvents([]));
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
            School events and announcements
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <CalendarDays />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {event.title}
                </h2>

                <p className="mt-1 text-sm font-semibold text-blue-600">
                  {event.date}
                </p>

                <p className="mt-2 text-slate-600">
                  {event.description}
                </p>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
}