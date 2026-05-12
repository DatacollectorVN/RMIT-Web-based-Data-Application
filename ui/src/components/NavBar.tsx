import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import RoleBadge from "./RoleBadge";
import type { AuthUser } from "../types";

type Props = {
  authUser: AuthUser | null;
  onLogout: () => void;
};

export default function NavBar({ authUser, onLogout }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = authUser?.role ?? "buyer";

  return (
    <nav style={styles.nav}>
      {/* Left: navigation links */}
      <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
        <NavLink to="/buyer" style={navLinkStyle}>Products</NavLink>
        {role === "admin" && (
          <NavLink to="/admin" style={navLinkStyle}>Dashboard</NavLink>
        )}
      </div>

      {/* Centre: logo */}
      <NavLink to="/" style={styles.logo}>GlowShop</NavLink>

      {/* Right: search icon + auth */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button type="button" onClick={() => navigate("/buyer")} style={styles.iconBtn} aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
        </button>

        {authUser ? (
          <div style={{ position: "relative" }}>
            {/* Avatar button */}
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              style={{ ...styles.iconBtn, display: "flex", alignItems: "center" }}
              aria-label="Account menu"
            >
              <div style={styles.avatar}>
                {(authUser.username?.[0] ?? "U").toUpperCase()}
              </div>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1A3028", margin: 0 }}>{authUser.username}</p>
                  <div style={{ marginTop: 6 }}><RoleBadge role={role} /></div>
                </div>
                <DropdownItem label="My Orders" onClick={() => { setMenuOpen(false); navigate("/buyer"); }} />
                {role === "admin" && (
                  <DropdownItem label="Dashboard" onClick={() => { setMenuOpen(false); navigate("/admin"); }} />
                )}
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  style={{ ...styles.dropdownItem, color: "#C0392B", borderTop: "1px solid #E8EDD8", border: "none" }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={styles.loginBtn}
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

function DropdownItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={styles.dropdownItem}>
      {label}
    </button>
  );
}

function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    color:          isActive ? "#3A7D52" : "#1A3028",
    fontSize:       11.5,
    fontWeight:     isActive ? 600 : 500,
    letterSpacing:  "0.3px",
    textDecoration: "none",
    borderBottom:   isActive ? "1.5px solid #3A7D52" : "1.5px solid transparent",
  };
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background:     "#FFFFFF",
    borderBottom:   "1px solid #D4DCC8",
    height:         58,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "0 28px",
    position:       "sticky",
    top:            0,
    zIndex:         50,
  },
  logo: {
    fontFamily:     "'Playfair Display', Georgia, serif",
    color:          "#1A3028",
    fontSize:       22,
    fontWeight:     800,
    letterSpacing:  "1px",
    textDecoration: "none",
    position:       "absolute",
    left:           "50%",
    transform:      "translateX(-50%)",
  },
  iconBtn: {
    background: "none",
    border:     "none",
    cursor:     "pointer",
    color:      "#1A3028",
    padding:    0,
  },
  avatar: {
    width:          28,
    height:         28,
    borderRadius:   "50%",
    background:     "#D8ECE4",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       12,
    fontWeight:     700,
    color:          "#1A4030",
  },
  dropdown: {
    position:   "absolute",
    right:      0,
    top:        36,
    width:      200,
    background: "#FFFFFF",
    border:     "1px solid #D4DCC8",
    borderRadius: 4,
    zIndex:     100,
    overflow:   "hidden",
  },
  dropdownHeader: {
    padding:      "10px 14px",
    borderBottom: "1px solid #E8EDD8",
  },
  dropdownItem: {
    display:    "block",
    width:      "100%",
    textAlign:  "left",
    padding:    "9px 14px",
    fontSize:   12,
    color:      "#1A3028",
    background: "none",
    border:     "none",
    borderBottom: "1px solid #F4F5EE",
    cursor:     "pointer",
  } as React.CSSProperties,
  loginBtn: {
    background:    "#1A3028",
    color:         "#FFFFFF",
    border:        "none",
    padding:       "7px 16px",
    fontSize:      10,
    fontWeight:    600,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    borderRadius:  2,
    cursor:        "pointer",
  } as React.CSSProperties,
};
