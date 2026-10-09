import axios from "axios";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowUp,
  AlertCircle,
  Wrench,
  Search,
  MapPin,
  CheckCircle,
  Activity,
  Settings,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Radio,
  Clock,
  RefreshCw,
  Navigation,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const getEmployeeName = (u) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
  u.email ||
  `Employee #${u.id}`;

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Auto invalidates map container size on viewport changes
const MapResizeFix = () => {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 100);
    const t2 = setTimeout(fix, 500);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", fix);
    };
  }, [map]);
  return null;
};

// Swiggy/Zomato Animated Avatar Marker
const createSwiggyMarker = (emp) => {
  const isMoving =
    (emp.status || "").toLowerCase() === "on route" || Number(emp.speed) > 2;
  const initials = emp.name
    ? emp.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "EM";

  return L.divIcon({
    className: "swiggy-fleet-pin",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        ${
          isMoving
            ? `<div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(223, 23, 60, 0.25); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        
        <!-- Directional Pointer -->
        <div style="
          position: absolute; 
          top: -1px; 
          width: 0; 
          height: 0; 
          border-left: 4px solid transparent; 
          border-right: 4px solid transparent; 
          border-bottom: 7px solid #DF173C;
          transform-origin: center 23px;
          transform: rotate(${Number(emp.heading) || 0}deg);
          transition: transform 0.4s ease-out;
        "></div>

        <!-- Rider circular avatar -->
        <div style="
          position: relative; 
          width: 32px; 
          height: 32px; 
          border-radius: 9999px; 
          background: #09090b; 
          border: 2px solid ${isMoving ? "#DF173C" : "#10b981"}; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.35); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #ffffff; 
          font-weight: 800; 
          font-size: 11px;
        ">
          ${initials}
          <span style="
            position: absolute; 
            bottom: -2px; 
            right: -2px; 
            width: 8px; 
            height: 8px; 
            border-radius: 9999px; 
            background: ${isMoving ? "#DF173C" : "#10b981"}; 
            border: 1.5px solid #ffffff;
          "></span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [employees, setEmployees] = useState([]);
  const [lifts, setLifts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live Workforce Telemetry State (Starts Clean/Dynamic)
  const [trackingAgents, setTrackingAgents] = useState([]);
  const historyTrails = useRef({});

  // Telemetry polling routine
  const fetchTelemetry = useCallback(async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API_URL}tracking/live`, authHeaders());
      } catch {
        res = await axios.get(`${API_URL}tracking`, authHeaders());
      }

      if (Array.isArray(res.data)) {
        const formatted = res.data
          .filter((item) => {
            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          })
          .map((item) => {
            const userId = item.user_id || item.id;
            const lat = parseFloat(item.latitude || item.lat);
            const lng = parseFloat(item.longitude || item.lng);
            const prevHistory = historyTrails.current[userId] || [];
            const newPos = [lat, lng];
            const updatedTrail = [...prevHistory.slice(-10), newPos];
            historyTrails.current[userId] = updatedTrail;

            return {
              ...item,
              user_id: userId,
              name:
                item.name ||
                [item.first_name, item.last_name].filter(Boolean).join(" ") ||
                `User #${userId}`,
              employee_code: item.employee_code || `EMP-${userId}`,
              latitude: lat,
              longitude: lng,
              speed: Number(item.speed) || 0,
              heading: Number(item.heading) || 0,
              status: item.status || "On Duty",
              current_destination: item.current_destination || "Assigned Site",
              trail: updatedTrail,
            };
          });

        setTrackingAgents(formatted);
      } else {
        setTrackingAgents([]);
      }
    } catch {
      // Keep existing agents on temporary connection hiccups
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, liftsRes, ticketsRes, tasksRes] =
        await Promise.allSettled([
          axios.get(`${API_URL}users`, authHeaders()),
          axios.get(`${API_URL}lifts`, authHeaders()),
          axios.get(`${API_URL}tickets`, authHeaders()),
          axios.get(`${API_URL}tasks`, authHeaders()),
        ]);

      setEmployees(
        usersRes.status === "fulfilled" && Array.isArray(usersRes.value?.data)
          ? usersRes.value.data
          : [],
      );
      setLifts(
        liftsRes.status === "fulfilled" && Array.isArray(liftsRes.value?.data)
          ? liftsRes.value.data
          : [],
      );
      setTickets(
        ticketsRes.status === "fulfilled" &&
          Array.isArray(ticketsRes.value?.data)
          ? ticketsRes.value.data
          : [],
      );
      setTasks(
        tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value?.data)
          ? tasksRes.value.data
          : [],
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchTelemetry();

    // 5-second live telemetry refresh loop
    const telemetryTimer = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(telemetryTimer);
  }, [fetchAll, fetchTelemetry]);

  const lookupLiftLabel = useCallback(
    (liftId) => {
      const lift = lifts.find((l) => l.id === liftId);
      return lift
        ? `${lift.lift_code}${lift.building_name ? ` — ${lift.building_name}` : ""}`
        : `Lift #${liftId}`;
    },
    [lifts],
  );

  const lookupEmployeeName = useCallback(
    (empId) => {
      const emp = employees.find((e) => e.id === empId);
      return emp ? getEmployeeName(emp) : "Unassigned";
    },
    [employees],
  );

  // Derived metrics
  const activeEmployeeCount = useMemo(
    () => employees.filter((e) => e.is_active).length,
    [employees],
  );
  const activeLiftCount = useMemo(
    () => lifts.filter((l) => l.is_active).length,
    [lifts],
  );

  const openTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          !["closed", "cancelled"].includes((t.status || "").toLowerCase()),
      ),
    [tickets],
  );
  const highPriorityOpenCount = useMemo(
    () =>
      openTickets.filter((t) =>
        ["high", "urgent"].includes((t.priority || "").toLowerCase()),
      ).length,
    [openTickets],
  );

  const ongoingInstalls = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.category || "").toLowerCase() === "installation" &&
          !["completed", "cancelled"].includes((t.status || "").toLowerCase()),
      ),
    [tasks],
  );
  const overdueInstallCount = useMemo(() => {
    const today = new Date();
    return ongoingInstalls.filter(
      (t) => t.due_date && new Date(t.due_date) < today,
    ).length;
  }, [ongoingInstalls]);

  const summaryCards = [
    {
      title: "Total Employees",
      value: employees.length,
      active: `${activeEmployeeCount} Active Workforce`,
      icon: <Users size={20} />,
      color: "text-blue-600",
      bg: "bg-blue-500/10 border-blue-200/60",
      badgeStyle: "bg-blue-50 text-blue-700 border-blue-200/80",
      glow: "from-blue-600/10 via-blue-500/5 to-transparent",
      hoverBorder: "hover:border-blue-400/50",
      onClick: () => navigate("/admin/employees"),
    },
    {
      title: "Total Lifts",
      value: lifts.length,
      active: `${activeLiftCount} Active Elevators`,
      icon: <ArrowUp size={20} />,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-200/60",
      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      glow: "from-emerald-600/10 via-emerald-500/5 to-transparent",
      hoverBorder: "hover:border-emerald-400/50",
      onClick: () => navigate("/admin/lifts"),
    },
    {
      title: "Open Tickets",
      value: openTickets.length,
      active:
        highPriorityOpenCount > 0
          ? `${highPriorityOpenCount} High Priority`
          : "All Optimal",
      icon: <AlertCircle size={20} />,
      color: "text-[#DF173C]",
      bg: "bg-rose-500/10 border-rose-200/60",
      badgeStyle:
        highPriorityOpenCount > 0
          ? "bg-rose-50 text-[#DF173C] border-rose-200 font-bold"
          : "bg-zinc-100 text-zinc-600 border-zinc-200",
      glow: "from-rose-600/10 via-rose-500/5 to-transparent",
      hoverBorder: "hover:border-rose-400/50",
      onClick: () => navigate("/admin/tickets"),
    },
    {
      title: "Ongoing Installs",
      value: ongoingInstalls.length,
      active:
        overdueInstallCount > 0
          ? `${overdueInstallCount} Overdue Action`
          : "On Target Schedule",
      icon: <Wrench size={20} />,
      color: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-200/60",
      badgeStyle:
        overdueInstallCount > 0
          ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      glow: "from-amber-600/10 via-amber-500/5 to-transparent",
      hoverBorder: "hover:border-amber-400/50",
      onClick: () => navigate("/admin/tasks"),
    },
  ];

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [tasks]);

  const taskStatusStyle = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "bg-emerald-50 border-emerald-200/80 text-emerald-600";
      case "in progress":
      case "in_progress":
        return "bg-blue-50 border-blue-200/80 text-blue-600";
      case "cancelled":
        return "bg-rose-50 border-rose-200/80 text-rose-600";
      default:
        return "bg-zinc-100 border-zinc-200 text-zinc-600";
    }
  };

  const taskBadgeStyle = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 font-semibold";
      case "in progress":
      case "in_progress":
        return "border-blue-200/80 bg-blue-50/80 text-blue-700 font-semibold";
      case "cancelled":
        return "border-rose-200/80 bg-rose-50/80 text-rose-700 font-semibold";
      default:
        return "border-zinc-200 bg-white text-zinc-700 font-medium";
    }
  };

  const taskStatusIcon = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return <CheckCircle size={18} />;
    if (s === "in progress" || s === "in_progress")
      return <Activity size={18} />;
    return <Settings size={18} />;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/admin/lifts?search=${encodeURIComponent(q)}`);
  };

  const leadAgent = trackingAgents[0] || null;

  const inTransitCount = useMemo(
    () =>
      trackingAgents.filter(
        (a) => (a.status || "").toLowerCase() === "on route" || a.speed > 2,
      ).length,
    [trackingAgents],
  );

  return (
    <div className="min-h-full bg-[#f5f6f8] text-zinc-900 pb-10">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 space-y-5">
        {/* Dashboard heading */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#DF173C]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-[-0.035em] text-zinc-950">
              Operations Overview
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Monitor workforce, elevators, service activity and field
              operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-zinc-600">
                System Operational
              </span>
            </div>

            <button
              onClick={() => {
                fetchAll();
                fetchTelemetry();
              }}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw
                size={14}
                className={
                  loading ? "animate-spin text-[#DF173C]" : "text-zinc-500"
                }
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="relative rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_10px_35px_-24px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
              <Search size={19} />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lift code or building name..."
              className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />

            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#DF173C] px-5 text-xs font-bold text-white shadow-[0_8px_20px_-10px_rgba(223,23,60,0.8)] transition-all hover:bg-[#c91435] active:scale-[0.98] cursor-pointer"
            >
              Scan Lift
              <ArrowUpRight size={15} />
            </button>
          </div>
        </form>

        {error && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm shadow-sm">
            <div className="flex items-center gap-2.5 text-rose-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#DF173C] shadow-sm">
                <AlertCircle size={17} />
              </div>
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={fetchAll}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <button
              key={index}
              type="button"
              onClick={card.onClick}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-[0_10px_30px_-24px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_20px_40px_-25px_rgba(0,0,0,0.35)] cursor-pointer"
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 ${
                  index === 0
                    ? "bg-blue-500"
                    : index === 1
                      ? "bg-emerald-500"
                      : index === 2
                        ? "bg-[#DF173C]"
                        : "bg-amber-500"
                }`}
              />

              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.bg} ${card.color}`}
                >
                  {React.cloneElement(card.icon, { size: 18 })}
                </div>

                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 text-zinc-400 transition-all group-hover:border-zinc-200 group-hover:bg-white group-hover:text-zinc-800">
                  <ArrowUpRight size={14} />
                </span>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                  {card.title}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <h3 className="text-[34px] leading-none font-extrabold tracking-[-0.05em] text-zinc-950">
                    {loading ? (
                      <Loader2
                        size={25}
                        className="animate-spin text-zinc-300"
                      />
                    ) : (
                      card.value
                    )}
                  </h3>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3">
                <span
                  className={`inline-flex max-w-[85%] items-center gap-1.5 truncate rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${card.badgeStyle}`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
                  {loading ? "Syncing..." : card.active}
                </span>
                <span className="ml-2 text-[10px] font-semibold text-zinc-400 transition-colors group-hover:text-zinc-700">
                  Open
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.9fr)] gap-5 items-stretch">
          {/* Operations Section */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_35px_-25px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 px-5 sm:px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
                  <Activity size={18} className="text-[#DF173C]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-950">
                      Real-Time Operations
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      Live
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Current tasks, assignments and service activity
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/admin/tasks")}
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#DF173C] cursor-pointer"
              >
                View all tasks
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50">
                    <Loader2
                      size={21}
                      className="animate-spin text-[#DF173C]"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                    Syncing operations
                  </span>
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-zinc-400">
                  <ShieldCheck
                    size={34}
                    className="mb-3 text-emerald-500 stroke-[1.5]"
                  />
                  <span className="text-sm font-bold text-zinc-700">
                    All Operations Clear
                  </span>
                  <p className="mt-1 text-xs text-zinc-400">
                    No pending or delayed tasks recorded.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate("/admin/tasks")}
                      className="group flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 text-left transition-all hover:border-zinc-200 hover:bg-white hover:shadow-[0_10px_25px_-20px_rgba(0,0,0,0.4)] cursor-pointer"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${taskStatusStyle(
                            task.status,
                          )}`}
                        >
                          {taskStatusIcon(task.status)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-sm font-bold tracking-tight text-zinc-900 group-hover:text-[#DF173C]">
                              {lookupLiftLabel(task.lift_id)}
                            </h4>
                            <span className="rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600">
                              {task.category || "General"}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                            <span className="font-medium">
                              {lookupEmployeeName(task.assigned_to)}
                            </span>
                            {task.due_date && formatDate(task.due_date) && (
                              <>
                                <span className="text-zinc-300">•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={11} className="text-zinc-400" />
                                  {formatDate(task.due_date)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span
                          className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${taskBadgeStyle(
                            task.status,
                          )}`}
                        >
                          {task.status || "Pending"}
                        </span>
                        <ChevronRight
                          size={15}
                          className="text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-700"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5 text-[10px] font-semibold text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                Automated priority tracking active
              </span>
              <span className="text-zinc-400">Fleet network connected</span>
            </div>
          </section>

          {/* Swiggy/Zomato Grade Workforce Map */}
          <section
            onClick={() => navigate("/admin/fleet-radar")}
            className="group min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_35px_-25px_rgba(0,0,0,0.45)] transition-all hover:border-zinc-300 hover:shadow-[0_18px_45px_-25px_rgba(0,0,0,0.38)] cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
                    <MapPin size={18} className="text-[#DF173C]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-950">
                      Workforce Location
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {trackingAgents.length} Agents Tracked • {inTransitCount}{" "}
                      in Transit
                    </p>
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  <Radio size={11} className="text-emerald-500 animate-pulse" />
                  Live Radar
                </span>
              </div>

              <div className="p-4">
                <div className="relative isolate h-[310px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  <MapContainer
                    center={[
                      leadAgent ? leadAgent.latitude : 20.2961,
                      leadAgent ? leadAgent.longitude : 85.8245,
                    ]}
                    zoom={12}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    style={{
                      height: "100%",
                      width: "100%",
                      position: "relative",
                      zIndex: 0,
                    }}
                  >
                    <MapResizeFix />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Route polylines and live moving riders */}
                    {trackingAgents.map((emp) => (
                      <React.Fragment key={emp.user_id}>
                        {emp.trail && emp.trail.length > 1 && (
                          <Polyline
                            positions={emp.trail}
                            pathOptions={{
                              color: "#DF173C",
                              weight: 3,
                              dashArray: "4, 6",
                              opacity: 0.7,
                            }}
                          />
                        )}

                        <Marker
                          position={[emp.latitude, emp.longitude]}
                          icon={createSwiggyMarker(emp)}
                        >
                          <Popup>
                            <div className="font-sans p-1 min-w-[155px]">
                              <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                                <span className="font-extrabold text-xs text-zinc-900">
                                  {emp.name}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                                  {emp.employee_code}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-600 mt-1">
                                Dest:{" "}
                                <strong className="text-zinc-900">
                                  {emp.current_destination || "Site Visit"}
                                </strong>
                              </p>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100 text-[10px]">
                                <span className="font-mono text-zinc-500 font-semibold">
                                  {Math.round(emp.speed || 0)} km/h
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    (emp.status || "").toLowerCase() ===
                                    "on route"
                                      ? "bg-red-50 text-[#DF173C]"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {emp.status}
                                </span>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    ))}
                  </MapContainer>

                  {/* Swiggy/Zomato Live Fleet Floating HUD */}
                  <div className="absolute left-3 right-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-bold text-zinc-800">
                        {leadAgent
                          ? `${leadAgent.name} (${Math.round(leadAgent.speed || 0)} km/h)`
                          : "Fleet Dispatch Hub"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono font-semibold text-zinc-500">
                      <Navigation size={10} className="text-[#DF173C]" />
                      <span className="truncate max-w-[130px]">
                        {leadAgent?.current_destination || "Central Dispatch"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Primary hub
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-zinc-800">
                    {leadAgent?.current_destination || "Central Fleet Network"}
                  </p>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/admin/fleet-radar");
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 group-hover:text-[#DF173C]"
                >
                  Open Fleet Radar
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
