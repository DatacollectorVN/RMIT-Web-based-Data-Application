import type { UserRole } from "../types";

type Role = UserRole | "guest";

const ROLE_STYLES: Record<Role, { bg: string; color: string; label: string }> = {
  admin:    { bg: "#EDD8C8", color: "#7A3020", label: "Admin" },
  customer: { bg: "#E4DCF0", color: "#4A3068", label: "Seller" },
  buyer:    { bg: "#D8E8F4", color: "#1A3050", label: "Buyer" },
  guest:    { bg: "#E8EDD8", color: "#4A5A40", label: "Guest" }
};

type Props = {
  role?: UserRole;
};

export default function RoleBadge({ role }: Props) {
  const style = ROLE_STYLES[role ?? "guest"];
  return (
    <span
      style={{
        background:    style.bg,
        color:         style.color,
        padding:       "2px 8px",
        borderRadius:  10,
        fontSize:      10,
        fontWeight:    600,
        letterSpacing: "0.2px"
      }}
    >
      {style.label}
    </span>
  );
}
