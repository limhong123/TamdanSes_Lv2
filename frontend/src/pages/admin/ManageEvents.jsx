import {
  CalendarDays,
  CheckCircle,
  PartyPopper,
  Pencil,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    title: "",
    date: "",
    description: "",
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadEvents = async () => {
    try {
      const res = await api.get("/events/");
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("LOAD EVENTS ERROR:", err?.response?.data || err);
      setEvents([]);
      showMessage("error", "Cannot load events");
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      date: "",
      description: "",
    });
    setOpen(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setForm({
      title: event.title || "",
      date: event.date || "",
      description: event.description || "",
    });
    setOpen(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        title: form.title,
        description: form.description,
        event_date: form.date,
      };

      if (editing) {
        await api.put(`/events/${editing.id}`, payload);
        showMessage("success", "Event updated successfully");
      } else {
        await api.post("/events/", payload);
        showMessage("success", "Event created successfully");
      }

      setOpen(false);
      setEditing(null);
      setForm({
        title: "",
        date: "",
        description: "",
      });

      await loadEvents();
    } catch (err) {
      console.log("EVENT SAVE ERROR:", err?.response?.data || err);
      showMessage(
        "error",
        err?.response?.data?.detail || "Save event failed"
      );
    }
  };

  const deleteEvent = async () => {
    try {
      await api.delete(`/events/${deleteId}`);
      setDeleteId(null);
      await loadEvents();
      showMessage("success", "Event deleted successfully");
    } catch (err) {
      console.log("DELETE EVENT ERROR:", err?.response?.data || err);
      showMessage(
        "error",
        err?.response?.data?.detail || "Delete event failed"
      );
    }
  };
  localStorage.setItem("unread_notifications", "true");
  const today = new Date().toISOString().slice(0, 10);

  const upcomingEvents = events.filter(
    (event) => event.date && event.date >= today
  );

  const pastEvents = events.filter(
    (event) => event.date && event.date < today
  );

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-[999] flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg ${message.type === "success"
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
            }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}

          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-blue-600" size={30} />

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Manage Events
            </h1>

            <p className="text-sm text-slate-500">
              Create and manage school events
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Event
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard title="Total Events" value={events.length} />
        <SummaryCard title="Upcoming" value={upcomingEvents.length} />
        <SummaryCard title="Past Events" value={pastEvents.length} />
      </div>

      <h2 className="mb-4 text-xl font-bold text-slate-800">
        Upcoming Events
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {upcomingEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            openEdit={openEdit}
            setDeleteId={setDeleteId}
          />
        ))}

        {upcomingEvents.length === 0 && (
          <EmptyState text="No upcoming events yet" />
        )}
      </div>

      {pastEvents.length > 0 && (
        <>
          <h2 className="mb-4 mt-8 text-xl font-bold text-slate-800">
            Past Events
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                openEdit={openEdit}
                setDeleteId={setDeleteId}
                past
              />
            ))}
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={saveEvent}
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-lg"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? "Edit Event" : "Add Event"}
              </h2>

              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="Event title"
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
                required
              />

              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    date: e.target.value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
                required
              />

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Description"
                rows="4"
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            <button className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
              {editing ? "Update Event" : "Create Event"}
            </button>
          </form>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-slate-800">
              Delete Event
            </h2>

            <p className="mb-6 text-slate-500">
              Are you sure you want to delete this event?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="w-full rounded-xl border px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={deleteEvent}
                className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-4xl font-bold text-slate-800">
        {value}
      </h2>
    </div>
  );
}

function EventCard({ event, openEdit, setDeleteId, past = false }) {
  return (
    <div
      className={`rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-md ${past ? "opacity-70" : ""
        }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <PartyPopper size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {event.title}
            </h2>

            <p className="text-sm font-semibold text-blue-600">
              {event.date}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${past
            ? "bg-slate-100 text-slate-500"
            : "bg-green-100 text-green-700"
            }`}
        >
          {past ? "Past" : "Upcoming"}
        </span>
      </div>

      <p className="min-h-12 text-slate-600">
        {event.description || "No description"}
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={() => openEdit(event)}
          className="rounded-xl border px-4 py-2 text-slate-600 hover:bg-slate-100"
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={() => setDeleteId(event.id)}
          className="rounded-xl border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="col-span-full rounded-3xl border bg-white p-12 text-center shadow-sm">
      <PartyPopper className="mx-auto mb-4 text-blue-600" size={42} />

      <h2 className="text-xl font-bold text-slate-800">
        {text}
      </h2>

      <p className="mt-2 text-slate-500">
        Click Add Event to create one.
      </p>
    </div>
  );
}