import { FormEvent, useEffect, useState } from "react";
import { createProduct, deleteProduct, updateProduct } from "../api";
import type { AuthUser, Product, ProductInput } from "../types";

type Props = {
  authUser: AuthUser | null;
  selectedProduct: Product | null;
  onRefresh: () => void;
};

const EMPTY_FORM: ProductInput = {
  product_title: "",
  brand_name:    "",
  price:         0,
  product_tags:  "",
  image_local:   "",
};

export default function ProductFormPanel({ authUser, selectedProduct, onRefresh }: Props) {
  const [form, setForm]       = useState<ProductInput>(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Pre-fill the form when a product card is selected
  useEffect(() => {
    if (selectedProduct) {
      setForm({
        product_title: selectedProduct.product_title,
        brand_name:    selectedProduct.brand_name,
        price:         selectedProduct.price ?? 0,
        product_tags:  selectedProduct.product_tags ?? "",
        image_local:   selectedProduct.image_local ?? "",
      });
    }
  }, [selectedProduct]);

  const notify = (msg: string, err = false) => {
    setMessage(msg);
    setIsError(err);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createProduct(form, authUser?.token);
      notify("Product created successfully.");
      setForm(EMPTY_FORM);
      onRefresh();
    } catch (err) {
      notify(`Create failed: ${(err as Error).message}`, true);
    }
  };

  const onUpdate = async () => {
    if (!selectedProduct) return;
    try {
      await updateProduct(selectedProduct.product_id, form, authUser?.token);
      notify("Product updated.");
      onRefresh();
    } catch (err) {
      notify(`Update failed: ${(err as Error).message}`, true);
    }
  };

  const onDelete = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProduct(selectedProduct.product_id, authUser?.token);
      notify("Product deleted.");
      setForm(EMPTY_FORM);
      onRefresh();
    } catch (err) {
      notify(`Delete failed: ${(err as Error).message}`, true);
    }
  };

  // Generic field change handler
  const field = (key: keyof ProductInput) => ({
    value: String(form[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({
        ...prev,
        [key]: key === "price" ? Number(e.target.value) : e.target.value,
      })),
  });

  return (
    <div style={{ maxWidth: 1180, margin: "20px auto 40px", padding: "0 20px" }}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Product Management</h2>
        <p style={styles.hint}>
          Select a product card above → fill the form → Add / Update / Delete
        </p>

        {message && (
          <p style={{ ...styles.message, color: isError ? "#C0392B" : "#2D6A4F", background: isError ? "#FDECEA" : "#EAF4EE", borderColor: isError ? "#F5A7A5" : "#A8D8B8" }}>
            {message}
          </p>
        )}

        <form onSubmit={onCreate} style={styles.form}>
          <input placeholder="Product name *"        required {...field("product_title")} style={styles.input} />
          <input placeholder="Brand name *"          required {...field("brand_name")}    style={styles.input} />
          <input placeholder="Price *" type="number" required {...field("price")}          style={styles.input} />
          <input placeholder="Image path (optional)"          {...field("image_local")}    style={styles.input} />
          <input placeholder="Description (optional)"         {...field("product_tags")}   style={{ ...styles.input, gridColumn: "1 / -1" }} />

          <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <ActionBtn label="Add Product"     color="#1A3028"                           type="submit"   />
            <ActionBtn label="Update Selected" color="#3A7D52" disabled={!selectedProduct} onClick={onUpdate} />
            <ActionBtn label="Delete Selected" color="#C0392B" disabled={!selectedProduct} onClick={onDelete} />
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionBtn({
  label, color, disabled = false, type = "button", onClick,
}: {
  label: string; color: string; disabled?: boolean; type?: "button" | "submit"; onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ background: color, color: "#FFFFFF", border: "none", borderRadius: 4, padding: "10px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: disabled ? 0.4 : 1 }}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel:   { background: "#FFFFFF", border: "1px solid #D4DCC8", borderRadius: 4, padding: 24 },
  title:   { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#1A3028", margin: "0 0 4px" },
  hint:    { fontSize: 12, color: "#687860", margin: "0 0 16px" },
  message: { fontSize: 12, border: "1px solid", borderRadius: 4, padding: "8px 12px", marginBottom: 12 },
  form:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  input:   { border: "1px solid #D4DCC8", borderRadius: 4, padding: "9px 12px", fontSize: 12, color: "#1A3028", background: "#FAFAF8" },
};
