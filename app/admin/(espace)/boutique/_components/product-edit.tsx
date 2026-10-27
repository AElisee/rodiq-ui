"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminBackLink, DetailPanel } from "@/components/admin/admin-detail";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { useOrdersHydrated } from "@/lib/stores/order-store";
import { DeleteProduct } from "./product-actions";
import { ProductReadState, useAdminProduct } from "./product-details";
import { ProductFormFields, useSoldCounts } from "./product-form";

// Modification d'un produit : formulaire complet, retour à la fiche une fois enregistré
export const ProductEdit = ({ id }: { id: string }) => {
  const router = useRouter();
  const ordersHydrated = useOrdersHydrated();
  const { product, error, retry } = useAdminProduct(id);
  const sold = useSoldCounts();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return <div className="min-h-96" aria-hidden />;
  if (!product || !ordersHydrated) return <ProductReadState error={error} retry={retry} />;

  const detailHref = `/admin/boutique/produits/${encodeURIComponent(product.id)}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={`Modifier ${product.name}`} description="Les modifications s'appliquent tout de suite à la boutique.">
        <DeleteProduct
          product={product}
          onDeleted={() => {
            setDeleted(true);
            router.push("/admin/boutique/produits");
          }}
        />
      </AdminPageHeader>

      <AdminBackLink href={detailHref}>Fiche du produit</AdminBackLink>

      <div className="max-w-3xl">
        <DetailPanel title="Produit">
          {/* Remonté quand une autre version est lue (refus 409 : le produit a changé entre-temps) */}
          <ProductFormFields
            key={product.version}
            product={product}
            sold={sold}
            onDone={() => router.push(detailHref)}
            onCancel={() => router.push(detailHref)}
          />
        </DetailPanel>
      </div>
    </div>
  );
};
