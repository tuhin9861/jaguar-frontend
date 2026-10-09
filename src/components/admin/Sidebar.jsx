import React, { useEffect, useRef } from "react";
import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Activity,
  Briefcase,
  Users,
  UserPlus,
  ArrowUpDown,
  ClipboardList,
  Ticket,
  CalendarCheck,
  MapPin,
  FileBarChart,
  TrendingUp,
  Wrench,
  LogOut,
  X,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_ENDPOINT}`;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const LOGIN_TIME_KEY = "login_time";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
});

const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type");
  localStorage.removeItem(LOGIN_TIME_KEY);
};

const Sidebar = ({ isOpen, closeSidebar }) => {
  const navigate = useNavigate();
  const checkIntervalRef = useRef(null);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}auth/logout`, {}, authHeaders());
    } catch (err) {
      console.error(
        "Logout API call failed:",
        err.response?.data?.detail || err.message,
      );
    } finally {
      clearSession();
      navigate("/login");
    }
  };

  useEffect(() => {
    if (!localStorage.getItem(LOGIN_TIME_KEY)) {
      localStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
    }

    const checkSessionExpiry = () => {
      const loginTime = Number(localStorage.getItem(LOGIN_TIME_KEY));
      if (!loginTime || Date.now() - loginTime >= SESSION_DURATION_MS) {
        clearSession();
        navigate("/login");
      }
    };

    checkSessionExpiry();
    checkIntervalRef.current = setInterval(checkSessionExpiry, 60 * 1000);

    return () => clearInterval(checkIntervalRef.current);
  }, [navigate]);

  const navItems = [
    { path: "/admin/dashboard", icon: BarChart3, label: "Dashboard" },
    { path: "/admin/department", icon: Activity, label: "Departments" },
    { path: "/admin/designations", icon: Briefcase, label: "Designations" },
    { path: "/admin/employees", icon: UserPlus, label: "Employees" },
    { path: "/admin/customers", icon: Users, label: "Customers" },
    { path: "/admin/lifts", icon: ArrowUpDown, label: "Lifts" },
    { path: "/admin/tasks", icon: ClipboardList, label: "Tasks" },
    { path: "/admin/tickets", icon: Ticket, label: "Tickets" },
    { path: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
    { path: "/admin/tracking", icon: MapPin, label: "Tracking" },
    { path: "/admin/reports", icon: FileBarChart, label: "Reports" },
    { path: "/admin/sales-report", icon: TrendingUp, label: "Sales Report" },
    { path: "/admin/service-reports", icon: Wrench, label: "Service Reports" },
  ];

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-60 lg:w-64 bg-black border-r border-neutral-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full px-3 py-2 justify-between">
        {/* Mobile Close Button */}
        <div className="flex justify-end lg:hidden mb-1">
          <button
            onClick={closeSidebar}
            className="p-1 text-gray-400 hover:text-[#DF173C] hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic proportional navigation */}
        <nav className="flex flex-col flex-1 min-h-0 py-0.5 overflow-y-auto pr-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) closeSidebar();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none shrink-0 ${
                  isActive
                    ? "bg-gradient-to-r from-[#DF173C] to-black text-white font-semibold shadow-md shadow-red-950/20"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={`shrink-0 ${isActive ? "text-white" : "text-neutral-400"}`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Logout Button */}
        <div className="pt-2 border-t border-neutral-800/80 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-sm text-neutral-400 hover:text-[#DF173C] hover:bg-white/5 rounded-lg font-medium transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="truncate">System Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
