import { useState, useEffect } from "react";
import {
  Store,
  Wifi,
  WifiOff,
  Clock,
  UserCheck,
  Bell,
  Palette,
  RefreshCw,
  Smartphone,
  Monitor,
  LogOut,
  ChevronDown
} from "lucide-react";
import { User, SystemSettings, ThemeType, NotificationItem } from "../types";

interface HeaderProps {
  currentUser: User;
  users: User[];
  onSwitchUser: (user: User) => void;
  settings: SystemSettings;
  onUpdateTheme: (theme: ThemeType) => void;
  isOnline: boolean;
  offlineCount: number;
  onSyncOffline: () => void;
  isSyncing: boolean;
  activeView: string;
  onNavigate: (view: string) => void;
  isMobilePOSMode: boolean;
  onToggleMobileMode: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id?: string, all?: boolean) => void;
}

export function Header({
  currentUser,
  users,
  onSwitchUser,
  settings,
  onUpdateTheme,
  isOnline,
  offlineCount,
  onSyncOffline,
  isSyncing,
  activeView,
  onNavigate,
  isMobilePOSMode,
  onToggleMobileMode,
  notifications,
  onMarkNotificationRead
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifs = notifications.filter(n => !n.read);

  const themeOptions: { id: ThemeType; label: string; bg: string; group: "vibrant" | "dark" }[] = [
    { id: "grey", label: "Classic Slate", bg: "bg-neutral-600", group: "vibrant" },
    { id: "blue", label: "Sapphire Ocean", bg: "bg-blue-600", group: "vibrant" },
    { id: "green", label: "Emerald Fresh", bg: "bg-emerald-600", group: "vibrant" },
    { id: "purple", label: "Royal Purple", bg: "bg-purple-600", group: "vibrant" },
    { id: "amber", label: "Warm Amber", bg: "bg-amber-500", group: "vibrant" },
    { id: "rose", label: "Ruby Crimson", bg: "bg-rose-600", group: "vibrant" },
    { id: "teal", label: "Teal Modern", bg: "bg-teal-600", group: "vibrant" },
    { id: "light", label: "Clean Light", bg: "bg-neutral-200", group: "vibrant" },
    { id: "dark", label: "Midnight Dark", bg: "bg-neutral-950", group: "dark" },
    { id: "black_grey", label: "Onyx Carbon", bg: "bg-neutral-900", group: "dark" },
    { id: "high_contrast", label: "Solar High Contrast", bg: "bg-yellow-400", group: "dark" }
  ];

  return (
    <header className="bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 select-none shadow-xs">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate("pos")}
          className="flex items-center gap-2.5 text-left focus:outline-hidden"
          title="Apex Retail System Home"
        >
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
            <Store className="w-5 h-5 text-neutral-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900 tracking-tight leading-none text-base">
                {settings.businessName}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold uppercase bg-neutral-100 text-neutral-700 tracking-wider">
                POS
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">Terminal #01 • Main Mart</p>
          </div>
        </button>

        {/* Online / Offline status badge */}
        <div className="hidden sm:flex items-center ml-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <WifiOff className="w-3.5 h-3.5" />
              Offline — Will Sync
            </span>
          )}

          {/* Pending offline sales button */}
          {offlineCount > 0 && (
            <button
              onClick={onSyncOffline}
              disabled={isSyncing || !isOnline}
              className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-xs hover:bg-amber-600 disabled:opacity-50 transition"
              title="Click to synchronize offline transactions"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              Sync {offlineCount} Offline
            </button>
          )}
        </div>
      </div>

      {/* Center Clock */}
      <div className="hidden md:flex items-center gap-2 text-xs font-mono font-medium text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200">
        <Clock className="w-3.5 h-3.5 text-neutral-500" />
        <span>{timeStr || "00:00:00"}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Mobile POS / Full Dashboard Switcher */}
        <button
          onClick={onToggleMobileMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
            isMobilePOSMode
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
          }`}
          title={isMobilePOSMode ? "Switch to Full Desktop Admin" : "Switch to Touch Mobile POS View"}
        >
          {isMobilePOSMode ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMobilePOSMode ? "Mobile POS" : "Desktop View"}</span>
        </button>

        {/* Theme Picker */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowUserMenu(false);
              setShowNotifMenu(false);
            }}
            className="p-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition"
            title="Appearance Themes"
          >
            <Palette className="w-4 h-4" />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2.5 z-50 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-100 mb-1.5">
                <span className="text-xs font-bold text-neutral-900">Color Theme</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                  {settings.theme}
                </span>
              </div>

              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 pt-1 pb-1">
                Store Color Accents
              </div>
              <div className="space-y-0.5 mb-2">
                {themeOptions
                  .filter(t => t.group === "vibrant")
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onUpdateTheme(t.id);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition ${
                        settings.theme === t.id
                          ? "bg-neutral-100 text-neutral-950 font-bold ring-1 ring-neutral-300"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full ${t.bg} shadow-2xs`}></span>
                        <span>{t.label}</span>
                      </span>
                      {settings.theme === t.id && <span className="text-neutral-900 font-bold">✓</span>}
                    </button>
                  ))}
              </div>

              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 pt-1 pb-1 border-t border-neutral-100">
                Dark & Low Glare Modes
              </div>
              <div className="space-y-0.5">
                {themeOptions
                  .filter(t => t.group === "dark")
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onUpdateTheme(t.id);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition ${
                        settings.theme === t.id
                          ? "bg-neutral-100 text-neutral-950 font-bold ring-1 ring-neutral-300"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full ${t.bg} shadow-2xs`}></span>
                        <span>{t.label}</span>
                      </span>
                      {settings.theme === t.id && <span className="text-neutral-900 font-bold">✓</span>}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
              setShowThemeMenu(false);
            }}
            className="p-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 relative transition"
            title="Notifications & Inventory Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 p-3 z-50 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2">
                <span className="text-xs font-bold text-neutral-900">System Alerts & Notifications</span>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={() => onMarkNotificationRead(undefined, true)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-4">No notifications.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition ${
                        n.read ? "bg-neutral-50 text-neutral-600" : "bg-blue-50/70 border border-blue-100 text-neutral-900"
                      }`}
                    >
                      <div className="font-semibold">{n.title}</div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Account / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowThemeMenu(false);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-xs font-semibold text-neutral-900">{currentUser.name}</div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50">
              <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                <div className="text-xs font-bold text-neutral-900">{currentUser.name}</div>
                <div className="text-[11px] text-neutral-500">{currentUser.email}</div>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 uppercase">
                  Role: {currentUser.role}
                </span>
              </div>

              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-3 py-1 mt-1">
                Switch Cashier / Role Account
              </div>

              <div className="space-y-0.5">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u);
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition ${
                      currentUser.id === u.id
                        ? "bg-neutral-100 text-neutral-900 font-bold"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
                      <div>
                        <div>{u.name}</div>
                        <span className="text-[10px] text-neutral-400 font-normal uppercase">{u.role}</span>
                      </div>
                    </div>
                    {currentUser.id === u.id && <span className="text-xs text-emerald-600">Active</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
