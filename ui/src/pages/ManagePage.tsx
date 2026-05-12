import { useState } from "react";
import BuyerPage from "./BuyerPage";
import ProductFormPanel from "../components/ProductFormPanel";
import type { AuthUser, Product } from "../types";

type Props = { authUser: AuthUser | null };

/**
 * Workspace for customer and admin roles.
 * Embeds the full product browsing UI (BuyerPage) with product selection enabled,
 * and adds a Product Management panel below for create / update / delete operations.
 */
export default function ManagePage({ authUser }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // Incrementing this key tells BuyerPage to re-fetch the product list
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <BuyerPage
        authUser={authUser}
        refreshKey={refreshKey}
        selectedProductId={selectedProduct?.product_id}
        onProductSelect={setSelectedProduct}
      />
      <ProductFormPanel
        authUser={authUser}
        selectedProduct={selectedProduct}
        onRefresh={() => setRefreshKey(k => k + 1)}
      />
    </>
  );
}
