import { memo } from "react";
import { rx } from "rextive/react";
import { productsLogic } from "@/logic/productsLogic";
import { ProductsLoading } from "./ProductsLoading";
import { ProductsError } from "./ProductsError";
import { ProductsEmpty } from "./ProductsEmpty";
import { ProductsList } from "./ProductsList";

export const ProductsContent = memo(function ProductsContent() {
  const { productsTask, refresh } = productsLogic();

  return rx(() => {
    const { loading, error, value } = productsTask();
    const hasProducts = value.products.length > 0;

    if (loading && !hasProducts) {
      return <ProductsLoading />;
    }

    if (error && !hasProducts) {
      return <ProductsError error={error} onRetry={refresh} />;
    }

    if (!hasProducts) {
      return <ProductsEmpty />;
    }

    return <ProductsList loading={loading} value={value} />;
  });
});
