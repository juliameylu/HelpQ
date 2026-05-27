import { Link } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/useApp.js";

export default function NotificationsPage() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications
  } = useApp();

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <DashboardLayout>
      <div className="page-stack">
        <header className="page-header-row">
          <div>
            <h1>Notifications</h1>
            <p>Stay updated on your classes and queue status</p>
          </div>
          <div className="page-header-actions">
            {unreadCount > 0 ? (
              <button
                className="btn btn-secondary btn-compact"
                type="button"
                onClick={markAllNotificationsRead}>
                <CheckCheck size={16} aria-hidden="true" />
                Mark all read
              </button>
            ) : null}
            {notifications.length > 0 ? (
              <button
                className="btn btn-secondary btn-compact"
                type="button"
                onClick={clearNotifications}>
                <Trash2 size={16} aria-hidden="true" />
                Clear all
              </button>
            ) : null}
          </div>
        </header>

        {notifications.length === 0 ? (
          <div className="empty-state card">
            <Bell size={32} aria-hidden="true" />
            <p>You&apos;re all caught up. No notifications yet.</p>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((item) => (
              <li
                className={`notification-item card${item.unread ? " unread" : ""}`}
                key={item.id}>
                <div className="notification-copy">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <span className="notification-time">{item.time}</span>
                </div>
                <div className="notification-actions">
                  {item.link ? (
                    <Link
                      className="text-link"
                      to={item.link}
                      onClick={() => markNotificationRead(item.id)}>
                      Open
                    </Link>
                  ) : null}
                  {item.unread ? (
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => markNotificationRead(item.id)}>
                      Mark read
                    </button>
                  ) : null}
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label="Delete notification"
                    onClick={() => deleteNotification(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
