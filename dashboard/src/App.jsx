import { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useAuth } from "./AuthContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const defaultForm = {
  distance_km: "",
  hour: "",
  day_of_week: "",
  prep_time_min: "",
  rider_load: "",
  weather_score: "",
};

/* ─── stat card ─── */
function StatCard({ label, value, accent = "text-white" }) {
  return (
    <div className="rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-6 flex flex-col gap-1">
      <span className="text-sm text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-3xl font-bold ${accent}`}>{value}</span>
    </div>
  );
}

/* ─── CSV export helper ─── */
function exportToCSV(predictions) {
  const headers = [
    "Distance (km)",
    "Hour",
    "Day",
    "Prep Time (min)",
    "Rider Load",
    "Weather",
    "Risk Level",
    "Probability",
    "Date",
  ];
  const rows = predictions.map((p) => [
    p.input_order.distance_km,
    p.input_order.hour,
    DAYS[p.input_order.day_of_week] ?? p.input_order.day_of_week,
    p.input_order.prep_time_min,
    p.input_order.rider_load,
    p.input_order.weather_score,
    p.ai_prediction.risk_level,
    (p.ai_prediction.predicted_probability * 100).toFixed(1) + "%",
    p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `predictions_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  /* ─── auth ─── */
  const { user, logout, authHeaders } = useAuth();

  /* ─── state ─── */
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const pageSize = 8;

  /* ─── fetch predictions ─── */
  const fetchPredictions = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api", { headers: authHeaders() })
      .then((res) => {
        if (res.status === 401) {
          logout();
          throw new Error("Session expired");
        }
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => setPredictions(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authHeaders, logout]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  /* ─── submit new prediction ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const payload = {
        distance_km: parseFloat(form.distance_km),
        hour: parseInt(form.hour, 10),
        day_of_week: parseInt(form.day_of_week, 10),
        prep_time_min: parseInt(form.prep_time_min, 10),
        rider_load: parseInt(form.rider_load, 10),
        weather_score: parseFloat(form.weather_score),
      };
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server responded ${res.status}`);
      }
      const { data } = await res.json();
      setSubmitMsg({
        type: "success",
        text: `Prediction: ${data.ai_prediction.risk_level} risk (${(data.ai_prediction.predicted_probability * 100).toFixed(0)}%)`,
      });
      setForm(defaultForm);
      fetchPredictions();
    } catch (err) {
      setSubmitMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── delete prediction ─── */
  const handleDelete = async (id) => {
    if (deleting) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchPredictions();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  /* ─── derived data ─── */
  const highRisk = predictions.filter(
    (p) => p.ai_prediction.risk_level === "HIGH",
  ).length;
  const lowRisk = predictions.length - highRisk;
  const avgProb =
    predictions.length > 0
      ? (
          predictions.reduce(
            (s, p) => s + p.ai_prediction.predicted_probability,
            0,
          ) / predictions.length
        ).toFixed(2)
      : "—";

  const filtered =
    filter === "ALL"
      ? predictions
      : predictions.filter((p) => p.ai_prediction.risk_level === filter);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ─── chart data: delays by day of week ─── */
  const dayChartData = DAYS.map((day, i) => {
    const dayPreds = predictions.filter((p) => p.input_order.day_of_week === i);
    return {
      day,
      total: dayPreds.length,
      high: dayPreds.filter((p) => p.ai_prediction.risk_level === "HIGH")
        .length,
    };
  });

  /* ─── chart data: predictions over time ─── */
  const timelineData = (() => {
    const grouped = {};
    predictions.forEach((p) => {
      if (!p.createdAt) return;
      const date = new Date(p.createdAt).toLocaleDateString();
      if (!grouped[date]) grouped[date] = { date, count: 0, highCount: 0 };
      grouped[date].count++;
      if (p.ai_prediction.risk_level === "HIGH") grouped[date].highCount++;
    });
    return Object.values(grouped).reverse();
  })();

  /* ─── filter button helper ─── */
  const filterBtn = (label, value, base, active) => (
    <button
      onClick={() => {
        setFilter(value);
        setPage(1);
      }}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        filter === value ? active : base
      }`}
    >
      {label}
    </button>
  );

  /* ─── render ─── */
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <div className="w-full max-w-400 mx-auto px-6 md:px-16 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Delivery Delay Dashboard
            </h1>
            <p className="text-slate-400 mt-2">
              Real-time prediction monitoring &amp; order risk analysis
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <span className="text-slate-400 text-sm">
              Hi, <span className="text-white font-medium">{user?.name}</span>
            </span>
            <button
              onClick={fetchPredictions}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button
              onClick={() => exportToCSV(filtered)}
              disabled={predictions.length === 0}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              ⬇ CSV
            </button>
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors font-medium text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-8 p-4 rounded-lg bg-red-900/60 border border-red-700 text-red-200">
            <strong>Error:</strong> {error}
            <button
              onClick={fetchPredictions}
              className="ml-4 underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Predictions" value={predictions.length} />
          <StatCard label="High Risk" value={highRisk} accent="text-red-400" />
          <StatCard label="Low Risk" value={lowRisk} accent="text-green-400" />
          <StatCard
            label="Avg Probability"
            value={avgProb}
            accent="text-amber-400"
          />
        </div>

        {/* Loading skeleton */}
        {loading && predictions.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
            <span className="ml-4 text-slate-400 text-lg">
              Loading predictions…
            </span>
          </div>
        ) : (
          <>
            {/* ─── Charts Row ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
              {/* Pie Chart */}
              <div className="rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Risk Distribution
                </h2>
                {predictions.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">
                    No data yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "High Risk", value: highRisk },
                          { name: "Low Risk", value: lowRisk },
                        ]}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill="#ef4444" />
                        <Cell fill="#22c55e" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar Chart — Delays by Day */}
              <div className="rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Predictions by Day
                </h2>
                {predictions.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">
                    No data yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dayChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="#3b82f6"
                        name="Total"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="high"
                        fill="#ef4444"
                        name="High Risk"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Line Chart — Over Time */}
              <div className="rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Predictions Over Time
                </h2>
                {timelineData.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">
                    No data yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Total"
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="highCount"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="High Risk"
                        dot={{ r: 4 }}
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ─── Bottom: Form + Table ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              {/* ─── Left column: Form ─── */}
              <div className="flex flex-col gap-10">
                {/* New Prediction Form */}
                <div className="rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-6">
                  <h2 className="text-lg font-semibold mb-4">New Prediction</h2>
                  <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-400">Distance (km)</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        required
                        value={form.distance_km}
                        onChange={(e) =>
                          setForm({ ...form, distance_km: e.target.value })
                        }
                        className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-400">Hour (0-23)</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        required
                        value={form.hour}
                        onChange={(e) =>
                          setForm({ ...form, hour: e.target.value })
                        }
                        className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-400">Day of Week</span>
                      <select
                        required
                        value={form.day_of_week}
                        onChange={(e) =>
                          setForm({ ...form, day_of_week: e.target.value })
                        }
                        className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select</option>
                        {DAYS.map((d, i) => (
                          <option key={i} value={i}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-400">Prep Time (min)</span>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        required
                        value={form.prep_time_min}
                        onChange={(e) =>
                          setForm({ ...form, prep_time_min: e.target.value })
                        }
                        className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-400">Rider Load (0-4)</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        required
                        value={form.rider_load}
                        onChange={(e) =>
                          setForm({ ...form, rider_load: e.target.value })
                        }
                        className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-slate-400">Weather (0-1)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        required
                        value={form.weather_score}
                        onChange={(e) =>
                          setForm({ ...form, weather_score: e.target.value })
                        }
                        className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <div className="col-span-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors font-medium"
                      >
                        {submitting ? "Predicting…" : "Predict Delay"}
                      </button>
                    </div>
                    {submitMsg && (
                      <div
                        className={`col-span-2 p-3 rounded-lg text-sm ${
                          submitMsg.type === "success"
                            ? "bg-green-900/40 border border-green-700 text-green-300"
                            : "bg-red-900/40 border border-red-700 text-red-300"
                        }`}
                      >
                        {submitMsg.text}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* ─── Right column: Table ─── */}
              <div className="xl:col-span-2 rounded-2xl bg-slate-800/60 backdrop-blur border border-slate-700 p-6">
                {/* Filter Buttons */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-slate-400 text-sm font-medium mr-1">
                    Filter:
                  </span>
                  {filterBtn(
                    "All",
                    "ALL",
                    "bg-slate-700/60 hover:bg-slate-600",
                    "bg-blue-600 ring-2 ring-blue-400 text-white",
                  )}
                  {filterBtn(
                    "High Risk",
                    "HIGH",
                    "bg-slate-700/60 hover:bg-slate-600",
                    "bg-red-600 ring-2 ring-red-400 text-white",
                  )}
                  {filterBtn(
                    "Low Risk",
                    "LOW",
                    "bg-slate-700/60 hover:bg-slate-600",
                    "bg-green-600 ring-2 ring-green-400 text-white",
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-slate-400 uppercase tracking-wide text-xs">
                        <th className="p-3">Distance</th>
                        <th className="p-3">Hour</th>
                        <th className="p-3">Day</th>
                        <th className="p-3">Prep Time</th>
                        <th className="p-3">Rider Load</th>
                        <th className="p-3">Weather</th>
                        <th className="p-3">Risk</th>
                        <th className="p-3">Probability</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="p-8 text-center text-slate-500"
                          >
                            No predictions found
                          </td>
                        </tr>
                      ) : (
                        paginated.map((p, index) => (
                          <tr
                            key={p._id || index}
                            className={`border-b border-slate-700/50 transition-colors ${
                              p.ai_prediction.risk_level === "HIGH"
                                ? "bg-red-900/20 hover:bg-red-900/30"
                                : "hover:bg-slate-700/30"
                            }`}
                          >
                            <td className="p-3">
                              {p.input_order.distance_km} km
                            </td>
                            <td className="p-3">
                              {String(p.input_order.hour).padStart(2, "0")}:00
                            </td>
                            <td className="p-3">
                              {DAYS[p.input_order.day_of_week] ??
                                p.input_order.day_of_week}
                            </td>
                            <td className="p-3">
                              {p.input_order.prep_time_min} min
                            </td>
                            <td className="p-3">{p.input_order.rider_load}</td>
                            <td className="p-3">
                              {p.input_order.weather_score}
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  p.ai_prediction.risk_level === "HIGH"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-green-500/20 text-green-400"
                                }`}
                              >
                                {p.ai_prediction.risk_level}
                              </span>
                            </td>
                            <td className="p-3 font-mono">
                              {(
                                p.ai_prediction.predicted_probability * 100
                              ).toFixed(1)}
                              %
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleDelete(p._id)}
                                disabled={deleting === p._id}
                                className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
                                title="Delete prediction"
                              >
                                {deleting === p._id ? "…" : "✕"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6 text-sm">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-600 transition-colors"
                      disabled={page === 1}
                    >
                      ← Prev
                    </button>
                    <span className="text-slate-400">
                      Page{" "}
                      <span className="text-white font-medium">{page}</span> of{" "}
                      <span className="text-white font-medium">
                        {totalPages}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => (p < totalPages ? p + 1 : p))
                      }
                      className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-600 transition-colors"
                      disabled={page === totalPages}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
