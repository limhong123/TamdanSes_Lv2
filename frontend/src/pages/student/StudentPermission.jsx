import { CheckCircle, FileText, Send, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentPermission() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    type: "Sick",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = () => {
    api
      .get("/permissions/student/me")
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/permissions/", form);

      setForm({
        type: "Sick",
        start_date: "",
        end_date: "",
        reason: "",
      });

      showMessage("success", "Permission request submitted");
      loadData();
    } catch (err) {
      showMessage("error", err?.response?.data?.detail || "Submit failed");
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? <CheckCircle /> : <XCircle />}
          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <FileText className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Permission</h1>
          <p className="text-sm text-slate-500">Request leave permission</p>
        </div>
      </div>

      <form onSubmit={submit} className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded-xl border px-4 py-3"
          >
            <option value="Sick">Sick</option>
            <option value="Family">Family</option>
            <option value="Personal">Personal</option>
            <option value="Other">Other</option>
          </select>

          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="rounded-xl border px-4 py-3"
            required
          />

          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="rounded-xl border px-4 py-3"
            required
          />

          <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
            <Send size={18} />
            Submit
          </button>
        </div>

        <textarea
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder="Write reason..."
          className="mt-4 w-full rounded-xl border px-4 py-3"
          rows="4"
          required
        />
      </form>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">From</th>
              <th className="p-4 text-left">To</th>
              <th className="p-4 text-left">Reason</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-4">{item.type}</td>
                <td className="p-4">{item.start_date}</td>
                <td className="p-4">{item.end_date}</td>
                <td className="p-4">{item.reason}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : item.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  No permission requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}