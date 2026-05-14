import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUser } from "../types";

type Props = {
  onLogin: (email: string, password: string) => Promise<AuthUser>;
};

export default function LoginPage({ onLogin }: Props) {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await onLogin(email, password);
      // Redirect based on role returned from the backend
      if (user.role === "admin")    navigate("/admin");
      else if (user.role === "customer") navigate("/customer");
      else navigate("/buyer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login to GlowShop</h1>
        <p style={styles.subtitle}>
          Enter your email and password. Your role and workspace are determined by your account.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={styles.input}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.primaryBtn}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/buyer")}
          style={styles.guestBtn}
        >
          Continue as Guest
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#687860" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#3A7D52", fontWeight: 600, textDecoration: "none" }}>Create one</Link>
        </p>

        <p style={styles.hint}>
          Demo accounts: <code>alice@example.com</code> · <code>david@example.com</code> (admin)
        </p>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:      "70vh",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "40px 16px",
  },
  card: {
    width:        "100%",
    maxWidth:     420,
    background:   "#FFFFFF",
    border:       "1px solid #D4DCC8",
    borderRadius: 12,
    padding:      32,
  },
  title: {
    fontFamily:   "'Playfair Display',serif",
    fontSize:     26,
    color:        "#1A3028",
    margin:       "0 0 6px",
  },
  subtitle: {
    fontSize:     13,
    color:        "#687860",
    margin:       "0 0 20px",
    lineHeight:   1.5,
  },
  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           10,
  },
  input: {
    border:       "1px solid #D4DCC8",
    borderRadius: 8,
    padding:      "10px 12px",
    fontSize:     14,
    color:        "#1A3028",
    outline:      "none",
  },
  primaryBtn: {
    background:    "#1A3028",
    color:         "#FFFFFF",
    border:        "none",
    borderRadius:  8,
    padding:       "11px 16px",
    fontSize:      14,
    fontWeight:    600,
    cursor:        "pointer",
    marginTop:     4,
  },
  guestBtn: {
    marginTop:    10,
    width:        "100%",
    background:   "#E8EDD8",
    color:        "#1A3028",
    border:       "none",
    borderRadius: 8,
    padding:      "10px 16px",
    fontSize:     13,
    fontWeight:   500,
    cursor:       "pointer",
  },
  error: {
    marginTop:  10,
    fontSize:   12,
    color:      "#C0392B",
    background: "#FDECEA",
    border:     "1px solid #F5A7A5",
    borderRadius: 4,
    padding:    "8px 10px",
  },
  hint: {
    marginTop:  14,
    fontSize:   11,
    color:      "#9AA394",
    lineHeight: 1.6,
  },
};
