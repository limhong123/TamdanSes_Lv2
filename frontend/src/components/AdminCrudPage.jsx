import { CheckCircle, Pencil, Plus, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios";

export default function AdminCrudPage({
  title,
  endpoint,
  columns,
  fields,
  icon: Icon,
  extraActions,
}) {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [open, setOpen] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const res = await api.get(endpoint);
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("LOAD ERROR:", err?.response?.data);
      setData([]);
      showMessage("error", "Cannot load data");
    }
  };

  useEffect(() => {
    loadData();
  }, [endpoint]);

  const openCreate = () => {
    setForm({});
    setEditingItem(null);
    setOpen(true);
  };

  const openEdit = (item) => {
    setForm(item);
    setEditingItem(item);
    setOpen(true);
  };

  const updateField = (field, rawValue) => {
    let value = rawValue;

    if (field.type === "number" || field.name.endsWith("_id")) {
      value = rawValue === "" ? "" : Number(rawValue);
    }

    setForm((prev) => ({
      ...prev,
      [field.name]: value,
    }));
  };

  const saveData = async (e) => {
    e.preventDefault();

    try {
      const payload = { ...form };

      if (editingItem) {
        const res = await api.put(`${endpoint}${editingItem.id}`, payload);

        setData((prev) =>
          prev.map((item) => (item.id === editingItem.id ? res.data : item))
        );

        showMessage("success", "Updated successfully");
      } else {
        const res = await api.post(endpoint, payload);

        setData((prev) => [...prev, res.data]);

        showMessage("success", "Created successfully");
      }

      setOpen(false);
      setForm({});
      setEditingItem(null);
    } catch (err) {
      console.log("SAVE ERROR:", err?.response?.data);

      showMessage(
        "error",
        err?.response?.data?.detail || "Save failed"
      );
    }
  };

  const deleteData = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`${endpoint}${deleteId}`);

      setData((prev) => prev.filter((item) => item.id !== deleteId));

      setDeleteId(null);
      showMessage("success", "Deleted successfully");
    } catch (err) {
      console.log("DELETE ERROR:", err?.response?.data);

      showMessage(
        "error",
        err?.response?.data?.detail || "Delete failed"
      );
    }
  };

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
          {Icon && <Icon className="text-blue-600" />}
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="p-4 text-left">
                  {col.label}
                </th>
              ))}
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-6 text-center text-slate-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="border-t border-slate-100"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="p-4 text-slate-700">
                      {col.render ? col.render(item) : item[col.key] ?? "-"}
                    </td>
                  ))}

                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {extraActions && extraActions(item)}

                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg border px-3 py-2 text-slate-600 hover:bg-slate-100"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="rounded-lg border px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={saveData}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editingItem ? "Edit" : "Add"} {title}
              </h2>

              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>

                  {field.type === "select" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(e) => updateField(field, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>

                      {(typeof field.options === "function"
                        ? field.options(form)
                        : field.options || []
                      ).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={form[field.name] || ""}
                      onChange={(e) => updateField(field, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            <button className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
              {editingItem ? "Update" : "Create"}
            </button>
          </form>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-slate-800">
              Delete Item
            </h2>

            <p className="mb-6 text-slate-500">
              Are you sure you want to delete this item?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={deleteData}
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