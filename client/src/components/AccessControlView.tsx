import { useState, useEffect } from "react";

interface AccessEntry {
  id: number;
  email: string;
  role: "admin" | "approver" | "requestor";
}

export default function AccessControlView() {
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "approver" | "requestor">("requestor");
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "approver" | "requestor">("requestor");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/users/access-control");
      if (!response.ok) {
        throw new Error("Failed to fetch access control list.");
      }
      const data = await response.json();
      setEntries(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading access control.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Please provide a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users/access-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add access entry.");
      }

      setSuccess(`Successfully granted '${role}' access to ${email.trim().toLowerCase()}.`);
      setEmail("");
      setRole("requestor");
      fetchEntries();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (id: number, targetEmail: string, newRole: "admin" | "approver" | "requestor") => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/users/access-control/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update role.");
      }

      setSuccess(`Successfully updated ${targetEmail} to '${newRole}'.`);
      setEditingId(null);
      fetchEntries();
    } catch (err: any) {
      setError(err.message || "An error occurred while updating role.");
    }
  };

  const handleDelete = async (id: number, targetEmail: string) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/users/access-control/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete access control entry.");
      }

      setSuccess(`Successfully revoked access for ${targetEmail}.`);
      setConfirmingId(null);
      fetchEntries();
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting access entry.");
    }
  };

  return (
    <div className="my-requests-page" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Access Control Management</h2>
          <p style={{ fontSize: "0.88rem", color: "var(--cal-ink-muted)", margin: "4px 0 0 0" }}>
            Configure and manage user emails authorized to access the team leave system.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "var(--approved-bg)",
          color: "var(--approved-text)",
          border: "1px solid var(--approved-border)",
          padding: "12px 14px",
          borderRadius: "var(--radius-md)",
          fontSize: "0.85rem",
          fontWeight: 500,
          marginBottom: "20px",
          lineHeight: 1.4
        }}>
          {success}
        </div>
      )}

      {/* Add New Authorized User Card */}
      <div style={{
        background: "var(--cal-white)",
        border: "1px solid var(--cal-border)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        marginBottom: "28px",
        boxShadow: "var(--shadow-sm)"
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1.05rem", fontWeight: 700 }}>Add Authorized User</h3>
        <form onSubmit={handleAdd} style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 250px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="access-email-input" style={{ fontSize: "0.82rem", fontWeight: 600 }}>Google Email Address</label>
            <input
              id="access-email-input"
              type="email"
              placeholder="e.g. employee@pontiacland.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                border: "1px solid var(--cal-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "0.92rem",
                background: "var(--cal-white)"
              }}
            />
          </div>

          <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="access-role-select" style={{ fontSize: "0.82rem", fontWeight: 600 }}>System Role</label>
            <select
              id="access-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{
                border: "1px solid var(--cal-border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "0.92rem",
                background: "var(--cal-white)"
              }}
            >
              <option value="requestor">Requestor</option>
              <option value="approver">Approver</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary animate-hover"
            disabled={submitting}
            style={{
              padding: "10px 20px",
              height: "40px",
              cursor: submitting ? "not-allowed" : "pointer"
            }}
          >
            {submitting ? "Adding..." : "Add Access"}
          </button>
        </form>
      </div>

      {/* Access list */}
      <div style={{
        background: "var(--cal-white)",
        border: "1px solid var(--cal-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--cal-border)", background: "var(--cal-outside-bg)" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Access List ({entries.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--cal-ink-muted)" }}>
            Loading authorized users...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--cal-ink-muted)" }}>
            No users configured in access list. Anyone signing in will default to 'Requestor'.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--cal-border)", fontSize: "0.8rem", color: "var(--cal-ink-muted)", textTransform: "uppercase", background: "var(--cal-outside-bg)" }}>
                  <th style={{ padding: "12px 20px" }}>Email Address</th>
                  <th style={{ padding: "12px 20px" }}>Role Permission</th>
                  <th style={{ padding: "12px 20px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--cal-border)", fontSize: "0.92rem" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 500 }}>
                      {entry.email}
                      {entry.email === "nabil@pontiacland.com" && (
                        <span style={{
                          marginLeft: "8px",
                          fontSize: "0.7rem",
                          background: "#e8f0fe",
                          color: "#1a73e8",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          fontWeight: 600
                        }}>Owner</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {editingId === entry.id ? (
                        <select
                          aria-label="Select role"
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as any)}
                          style={{
                            border: "1px solid var(--cal-border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "4px 8px",
                            fontSize: "0.85rem",
                            background: "var(--cal-white)"
                          }}
                        >
                          <option value="requestor">Requestor</option>
                          <option value="approver">Approver</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          background: entry.role === "admin" ? "var(--approved-bg)" : entry.role === "approver" ? "#e8f0fe" : "var(--cal-outside-bg)",
                          color: entry.role === "admin" ? "var(--approved-text)" : entry.role === "approver" ? "#1a73e8" : "var(--cal-ink-muted)",
                          border: entry.role === "admin" ? "1px solid var(--approved-border)" : entry.role === "approver" ? "1px solid #d2e3fc" : "1px solid var(--cal-border)"
                        }}>
                          {entry.role}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      {editingId === entry.id ? (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateRole(entry.id, entry.email, editingRole)}
                            style={{
                              border: "none",
                              background: "var(--color-accent)",
                              color: "white",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            style={{
                              border: "1px solid var(--cal-border)",
                              background: "white",
                              color: "var(--cal-ink)",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : confirmingId === entry.id ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--rejected-text)", fontWeight: 600 }}>Confirm?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id, entry.email)}
                            style={{
                              border: "none",
                              background: "var(--rejected-text)",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Yes, Revoke
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            style={{
                              border: "1px solid var(--cal-border)",
                              background: "white",
                              color: "var(--cal-ink)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditingRole(entry.role);
                              setConfirmingId(null);
                            }}
                            style={{
                              border: "1px solid var(--cal-border)",
                              background: "white",
                              color: "var(--color-accent)",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Edit
                          </button>
                          {entry.email !== "nabil@pontiacland.com" && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingId(entry.id);
                                setEditingId(null);
                              }}
                              style={{
                                border: "1px solid var(--rejected-border)",
                                background: "var(--rejected-bg)",
                                color: "var(--rejected-text)",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
