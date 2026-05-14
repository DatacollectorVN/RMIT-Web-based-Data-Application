import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api";
import type { AuthUser } from "../types";

type Props = {
  onLogin: (email: string, password: string) => Promise<AuthUser>;
};

const JOBS = [
  "Student", "Software Engineer", "Teacher", "Doctor", "Homemaker",
  "Business Owner", "Fashion Designer", "Nurse", "Marketing Professional",
  "Accountant", "Content Creator", "Sales Executive", "Graphic Designer",
  "HR Manager", "Beautician", "Pharmacist", "Journalist", "Architect",
  "Data Analyst", "Freelancer",
];

export default function RegisterPage({ onLogin }: Props) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email:     "",
    password:  "",
    confirm:   "",
    location:  "",
    age:       "",
    job:       "",
    gender:    "",
  });
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register({
        email:     form.email,
        password:  form.password,
        full_name: form.full_name,
        location:  form.location || undefined,
        age:       form.age ? Number(form.age) : undefined,
        job:       form.job || undefined,
        gender:    form.gender || undefined,
      });
      // Auto-login after registration
      await onLogin(form.email, form.password);
      navigate("/buyer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={s.badge}>New Account</span>
          <h1 style={s.title}>Join GlowShop</h1>
          <p style={s.subtitle}>Create your free account and start discovering beauty.</p>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          {/* Required fields */}
          <p style={s.sectionLabel}>ACCOUNT DETAILS</p>

          <Field label="Full Name *">
            <input value={form.full_name} onChange={set("full_name")} placeholder="Your name" required style={s.input} />
          </Field>

          <Field label="Email *">
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required style={s.input} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Password *">
              <input type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required minLength={6} style={s.input} />
            </Field>
            <Field label="Confirm Password *">
              <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" required style={s.input} />
            </Field>
          </div>

          {/* Optional profile fields */}
          <p style={{ ...s.sectionLabel, marginTop: 18 }}>PROFILE <span style={{ fontWeight: 400, color: "#9AA394" }}>(optional)</span></p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Location">
              <input value={form.location} onChange={set("location")} placeholder="e.g. Ho Chi Minh City" style={s.input} />
            </Field>
            <Field label="Age">
              <input type="number" value={form.age} onChange={set("age")} placeholder="e.g. 25" min={13} max={120} style={s.input} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Job">
              <select value={form.job} onChange={set("job")} style={s.input}>
                <option value="">— Select —</option>
                {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={set("gender")} style={s.input}>
                <option value="">— Select —</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </Field>
          </div>

          {error && (
            <p style={s.errorBox}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{ ...s.primaryBtn, marginTop: 20 }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#687860" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#3A7D52", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#687860", letterSpacing: "0.8px", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:         { minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" },
  card:         { width: "100%", maxWidth: 520, background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 12, padding: "32px 36px" },
  badge:        { display: "inline-block", background: "#E8EDD8", color: "#4A5A40", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", padding: "3px 12px", borderRadius: 20, marginBottom: 10 },
  title:        { fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#1A3028", margin: "0 0 6px" },
  subtitle:     { fontSize: 13, color: "#687860", margin: 0, lineHeight: 1.5 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "#687860", letterSpacing: "1.5px", margin: "0 0 10px", textTransform: "uppercase" as const },
  input:        { width: "100%", border: "1px solid #D4DCC8", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#1A3028", background: "#FAFAF8", boxSizing: "border-box" as const, outline: "none" },
  primaryBtn:   { width: "100%", background: "#1A3028", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  errorBox:     { marginTop: 10, fontSize: 12, color: "#C0392B", background: "#FDECEA", border: "1px solid #F5A7A5", borderRadius: 6, padding: "8px 12px" },
};
