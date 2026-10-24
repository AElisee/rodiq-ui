"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminBackLink, DetailNotFound, DetailPanel } from "@/components/admin/admin-detail";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { useCatalogHydrated, useCatalogProduct } from "@/lib/stores/catalog-store";
import { useOrdersHydrated } from "@/lib/stores/order-store";
import { ProductRowActions } from "./product-actions";
import { ProductFormFields, useSoldCounts } from "./product-form";

// Modification d'un produit : formulaire complet, retour à la fiche une fois enregistré
export const ProductEdit = ({ id }: { id: string }) => {
  const router = useRouter();
  const hydrated = useCatalogHydrated();
  const ordersHydrated = useOrdersHydrated();
  const product = useCatalogProduct(id);
  const sold = useSoldCounts();
  // Remonte le formulaire (rétablissement) pour repartir du produit à jour
  const [formKey, setFormKey] = useState(0);
  const [deleted, setDeleted] = useState(false);

  if (!hydrated || !ordersHydrated || deleted) return <div className="min-h-96" aria-hidden />;

  if (!product)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/boutique/produits">Produits</AdminBackLink>
        <DetailNotFound title="Ce produit est introuvable." href="/admin/boutique/produits" label="Retour aux produits" />
      </div>
    );

  const detailHref = `/admin/boutique/produits/${encodeURIComponent(product.id)}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={`Modifier ${product.name}`} description="Les modifications s'appliquent tout de suite à la boutique.">
        <ProductRowActions
          product={product}
          onDeleted={() => {
            setDeleted(true);
            router.push("/admin/boutique/produits");
          }}
          onReset={() => setFormKey((k) => k + 1)}
        />
      </AdminPageHeader>

      <AdminBackLink href={detailHref}>Fiche du produit</AdminBackLink>

      <div className="max-w-3xl">
        <DetailPanel title="Produit">
          <ProductFormFields
            key={formKey}
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
