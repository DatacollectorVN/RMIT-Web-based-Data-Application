import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_users: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  pending_orders: number;
}

interface MonthlyOrder {
  month: string;
  order_count: number;
  total_revenue: number;
}

interface TopUser {
  id: number;
  full_name: string;
  email: string;
  order_count: number;
  total_spent: number;
}

interface TopProduct {
  id: number;
  name: string;
  brand: string;
  units_sold: number;
  total_revenue: number;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status}`);
  const json = await res.json() as { data: T };
  return json.data;
}

// ── Custom tooltip for stacked bar ───────────────────────────────────────────

function MonthlyTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1A3028", border: "1px solid #3A7D52", borderRadius: 6, padding: "10px 14px" }}>
      <p style={{ color: "#A8D8B8", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: "#FFFFFF", fontSize: 11, margin: "2px 0" }}>
          {p.name}: {p.name === "Revenue ($)" ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [monthly,  setMonthly]  = useState<MonthlyOrder[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [topProds, setTopProds] = useState<TopProduct[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<Stats>("/api/v1/dashboard/stats"),
      fetchJson<MonthlyOrder[]>("/api/v1/dashboard/monthly-orders"),
      fetchJson<TopUser[]>("/api/v1/dashboard/top-users"),
      fetchJson<TopProduct[]>("/api/v1/dashboard/top-products"),
    ]).then(([s, m, u, p]) => {
      setStats(s); setMonthly(m); setTopUsers(u); setTopProds(p);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "#F4F5EE", minHeight: "100vh" }}>
      {/* Hero */}
      <section style={styles.hero}>
        <span style={styles.heroTag}>Admin</span>
        <h1 style={styles.heroTitle}>Dashboard</h1>
        <p style={styles.heroSub}>Real-time sales and user analytics for GlowShop.</p>
      </section>

      <div style={styles.page}>
        {loading ? (
          <p style={{ color: "#687860", fontSize: 13 }}>Loading metrics…</p>
        ) : (
          <>
            {/* KPI cards */}
            {stats && (
              <div style={styles.kpiRow}>
                <KpiCard label="Total Revenue"    value={`$${stats.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="all time" accent="#3A7D52" />
                <KpiCard label="Total Orders"     value={stats.total_orders.toLocaleString()}    sub={`${stats.pending_orders} pending`}   accent="#2C5F3E" />
                <KpiCard label="Avg Order Value"  value={`$${stats.avg_order_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="per order" accent="#1A3028" />
                <KpiCard label="Registered Users" value={stats.total_users.toLocaleString()}     sub="buyers"                              accent="#3A7D52" />
                <KpiCard label="Products"         value={stats.total_products.toLocaleString()}  sub="in catalogue"                        accent="#2C5F3E" />
              </div>
            )}

            {/* Monthly orders — stacked bar */}
            <Section title="Monthly Orders & Revenue" sub="Last 12 months">
              {monthly.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthly} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDD8" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#687860" }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: "#687860" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#687860" }} />
                    <Tooltip content={<MonthlyTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left"  dataKey="order_count"   name="Orders"      fill="#3A7D52" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="right" dataKey="total_revenue"  name="Revenue ($)" fill="#A8D8B8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>

            {/* Two-column: top users table + top products chart */}
            <div style={styles.twoCol}>
              {/* Top users */}
              <Section title="Top 10 Users by Spend" sub="Lifetime total">
                {topUsers.length === 0 ? <Empty /> : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {["#", "Name", "Email", "Orders", "Total Spent"].map(h => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((u, i) => (
                        <tr key={u.id} style={{ background: i % 2 === 0 ? "#FAFAF8" : "#FFFFFF" }}>
                          <td style={styles.td}>{i + 1}</td>
                          <td style={{ ...styles.td, fontWeight: 600, color: "#1A3028" }}>{u.full_name}</td>
                          <td style={{ ...styles.td, color: "#687860" }}>{u.email}</td>
                          <td style={{ ...styles.td, textAlign: "center" as const }}>{u.order_count}</td>
                          <td style={{ ...styles.td, fontWeight: 700, color: "#3A7D52" }}>${u.total_spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>

              {/* Top products */}
              <Section title="Top 10 Products by Revenue" sub="From completed orders">
                {topProds.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      layout="vertical"
                      data={topProds.map(p => ({ ...p, name: p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name }))}
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EDD8" />
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#687860" }} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 9, fill: "#1A3028" }} />
                      <Tooltip
                        formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]}
                        contentStyle={{ background: "#1A3028", border: "none", borderRadius: 6, fontSize: 11, color: "#FFFFFF" }}
                        labelStyle={{ color: "#A8D8B8", fontWeight: 700 }}
                        itemStyle={{ color: "#FFFFFF" }}
                      />
                      <Bar dataKey="total_revenue" name="Revenue ($)" fill="#2C5F3E" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ ...styles.kpiCard, borderTop: `3px solid ${accent}` }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#687860", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color: "#1A3028", margin: "0 0 4px", fontFamily: "'Playfair Display', serif" }}>{value}</p>
      <p style={{ fontSize: 10, color: "#687860" }}>{sub}</p>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={styles.cardTitle}>{title}</h2>
        <p style={{ fontSize: 11, color: "#687860", margin: 0 }}>{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p style={{ fontSize: 12, color: "#687860", textAlign: "center", padding: "32px 0" }}>No data yet.</p>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  hero:      { background: "linear-gradient(135deg,#1A3028 0%,#2C5F3E 60%,#3A7D52 100%)", padding: "52px 24px 44px", textAlign: "center" },
  heroTag:   { display: "inline-block", background: "rgba(168,216,184,0.18)", color: "#A8D8B8", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", padding: "4px 14px", borderRadius: 20, marginBottom: 14 } as React.CSSProperties,
  heroTitle: { fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" },
  heroSub:   { color: "#A8D8B8", fontSize: 13, margin: 0 },
  page:      { maxWidth: 1180, margin: "32px auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 24 },
  kpiRow:    { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 },
  kpiCard:   { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "18px 20px" },
  card:      { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 8, padding: "22px 24px" },
  twoCol:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  cardTitle: { fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: "#1A3028", margin: "0 0 2px" },
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: 11 },
  th:        { textAlign: "left" as const, padding: "7px 10px", fontSize: 10, fontWeight: 700, color: "#687860", textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "2px solid #E8EDD8" },
  td:        { padding: "8px 10px", fontSize: 11, color: "#1A3028", borderBottom: "1px solid #F4F5EE" },
};
