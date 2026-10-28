"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CoordinatorNotificationItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Mail,
  ShieldAlert,
  Calendar,
} from "lucide-react";

export default function CoordinatorNotificationsPage() {
  const [notifications, setNotifications] = useState<CoordinatorNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const fetchNotifications = () => {
    setLoading(true);
    api
      .get<CoordinatorNotificationItem[]>("/coordinator/notifications")
      .then((data) => setNotifications(data || []))
      .catch((err) => console.error("Error loading notifications:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/coordinator/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Notifications & Alerts"
        description="Audit log of coordination reminders, schedule revisions, escalation updates, and incoming warnings."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(filter === "ALL" ? "UNREAD" : "ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition ${
                filter === "UNREAD"
                  ? "bg-[#82c341] text-[#000000] border-[#82c341]"
                  : "bg-[var(--surface-color)] text-[var(--title-color)] border-[var(--border-color)]"
              }`}
            >
              <span>{filter === "UNREAD" ? "Showing Unread" : `Unread (${unreadCount})`}</span>
            </button>
            <button
              onClick={fetchNotifications}
              className="p-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--font-color)] animate-pulse bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            Loading coordination notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            <Bell className="w-8 h-8 text-[var(--font-color)] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">No Notifications</h3>
            <p className="text-xs text-[var(--paragraph-color)] mt-1">
              {filter === "UNREAD" ? "You have caught up with all incoming notifications." : "No notification history on record."}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-[var(--radius-lg)] border transition flex items-start justify-between gap-4 ${
                n.is_read
                  ? "bg-[var(--surface-color)] border-[var(--border-color)]"
                  : "bg-blue-50/20 border-blue-200 shadow-[var(--shadow-sm)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
                    n.notification_type === "ISSUE_ESCALATION"
                      ? "bg-red-50 text-red-600"
                      : n.notification_type === "OVERDUE_ALERT"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-[#82c341]/15 text-[#45525b]"
                  }`}
                >
                  {n.notification_type === "ISSUE_ESCALATION" ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : n.notification_type === "OVERDUE_ALERT" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-[var(--title-color)]">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                    )}
                    <Badge variant="outline">{n.notification_type.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-[var(--paragraph-color)] leading-relaxed max-w-2xl">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--font-color)] pt-1">
                    <span>Sender: {n.sender_name || "System"}</span>
                    <span>&bull;</span>
                    <span>Channel: {n.channel} (Verified In-App Record)</span>
                    <span>&bull;</span>
                    <span>{new Date(n.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[#82c341] text-[var(--title-color)] transition shrink-0"
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
