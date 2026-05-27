import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/useApp.js";

const TOGGLES = [
  {
    key: "emailNotifications",
    label: "Email notifications",
    description: "Receive email updates for important activity"
  },
  {
    key: "queueUpdates",
    label: "Queue updates",
    description: "Get notified when your queue position changes"
  },
  {
    key: "classAnnouncements",
    label: "Class announcements",
    description: "Hear about new sessions and class updates"
  }
];

export default function SettingsPage() {
  const { user, settings, updateSettings } = useApp();

  return (
    <DashboardLayout>
      <div className="page-stack">
        <header className="page-header-row">
          <div>
            <h1>Settings</h1>
            <p>Manage your account and notification preferences</p>
          </div>
        </header>

        <section className="card settings-card">
          <h2>Profile</h2>
          <dl className="settings-profile">
            <div>
              <dt>Name</dt>
              <dd>{user?.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
          </dl>
        </section>

        <section className="card settings-card">
          <h2>Notifications</h2>
          <ul className="settings-toggle-list">
            {TOGGLES.map((item) => (
              <li className="settings-toggle-row" key={item.key}>
                <div>
                  <p className="settings-toggle-label">{item.label}</p>
                  <p className="settings-toggle-desc">{item.description}</p>
                </div>
                <label className="switch">
                  <input
                    checked={Boolean(settings[item.key])}
                    onChange={(e) =>
                      updateSettings({ [item.key]: e.target.checked })
                    }
                    type="checkbox"
                  />
                  <span className="switch-slider" aria-hidden="true" />
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
