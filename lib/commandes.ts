// Cycle de vie d'une commande de la boutique :
// en_attente → en_preparation → prete (expédiée ou prête au retrait) → livree
// en_attente → annulee (par le client ou la cliente, tant que la préparation n'a pas commencé)
// en_attente / en_preparation → annulee (motif obligatoire, côté admin)
// Toute annulation rend le stock (fait par l'API, comme le retrait à la création)
export type OrderStatus = "en_attente" | "en_preparation" | "prete" | "livree" | "annulee";

export type DeliveryMode = "livraison" | "retrait";

export type PaymentMethod = "mobile_money" | "especes";

// Ligne figée au moment de la commande (le prix du catalogue peut changer ensuite)
export type OrderLine = {
  productId: string;
  variantId?: string;
  name: string;
  // Déclinaison choisie (teinte, contenance…)
  variantName?: string;
  unitPrice: number; // FCFA
  quantity: number;
};

// Coordonnées copiées du compte à la commande
export type OrderCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string;
  email: string;
};

export type Order = {
  id: string;
  // Référence courte communiquée au client ou à la cliente
  reference: string;
  lines: OrderLine[];
  customer: OrderCustomer;
  delivery: {
    mode: DeliveryMode;
    // Commune livrée ou ville desservie par expédition
    commune?: string;
    // Adresse ou repère, sans la commune
    address?: string;
  };
  deliveryFee: number; // FCFA, 0 pour un retrait au salon
  paymentMethod: PaymentMethod;
  paid: boolean;
  note?: string;
  status: OrderStatus;
  cancelledBy?: "cliente" | "salon";
  cancellationReason?: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO, dernier changement de statut
  // Vue du client ou de la cliente : annulation en ligne encore possible (calculé par l'API)
  canCancel?: boolean;
  // Vue de l'admin
  accountId?: string;
  paidAt?: string; // ISO
};

export const orderStatusMeta: Record<OrderStatus, { label: string; badgeClassName: string }> = {
  en_attente: { label: "Nouvelle", badgeClassName: "bg-sand text-cocoa" },
  en_preparation: { label: "En préparation", badgeClassName: "bg-blush text-cocoa" },
  prete: { label: "Expédiée / prête", badgeClassName: "border border-cocoa text-cocoa" },
  livree: { label: "Livrée", badgeClassName: "bg-cocoa text-pearl" },
  annulee: { label: "Annulée", badgeClassName: "border border-gold text-cocoa" },
};

// Libellé précis selon le mode de remise
export const orderStatusLabel = (order: Pick<Order, "status" | "delivery">) => {
  const pickup = order.delivery.mode === "retrait";
  if (order.status === "prete") return pickup ? "Prête au retrait" : "En livraison";
  if (order.status === "livree") return pickup ? "Retirée" : "Livrée";
  return orderStatusMeta[order.status].label;
};

// Explication du statut pour le suivi côté site (« Mes commandes »)
export const orderStatusDescription = (order: Pick<Order, "status" | "delivery">) => {
  const pickup = order.delivery.mode === "retrait";
  switch (order.status) {
    case "en_attente":
      return "Commande reçue : nous vous contactons pour la confirmer.";
    case "en_preparation":
      return pickup ? "Nous préparons votre commande pour le retrait au salon." : "Nous préparons votre colis.";
    case "prete":
      return pickup
        ? "Votre commande vous attend au salon."
        : "Votre colis est en route : le livreur vous appelle avant de passer.";
    case "livree":
      return pickup ? "Commande retirée au salon. Merci pour votre confiance." : "Commande livrée. Merci pour votre confiance.";
    case "annulee":
      return "Cette commande a été annulée.";
  }
};

// Libellé client des statuts, pour les filtres de « Mes commandes »
export const orderFilterLabels: Record<OrderStatus, string> = {
  en_attente: "Reçue",
  en_preparation: "En préparation",
  prete: "Expédiée / prête",
  livree: "Livrée / retirée",
  annulee: "Annulée",
};

export const deliveryModes: { value: DeliveryMode; label: string }[] = [
  { value: "livraison", label: "Livraison" },
  { value: "retrait", label: "Retrait au salon" },
];

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "especes", label: "Espèces à la remise" },
];

// Tarif d'une destination (FCFA) : commune d'Abidjan livrée à domicile, ou ville desservie par expédition
export type ShippingRate = { place: string; fee: number };

// Tarifs par défaut, modifiables depuis les réglages de l'admin
export const deliveryZones: ShippingRate[] = [
  { place: "Cocody", fee: 2000 },
  { place: "Riviera", fee: 2000 },
  { place: "Plateau", fee: 1500 },
  { place: "Marcory", fee: 1500 },
  { place: "Treichville", fee: 1500 },
  { place: "Yopougon", fee: 2500 },
  { place: "Bingerville", fee: 3000 },
];

export const shippingDestinations: ShippingRate[] = [
  { place: "Yamoussoukro", fee: 3500 },
  { place: "Bouaké", fee: 4000 },
  { place: "Daloa", fee: 4000 },
  { place: "San-Pédro", fee: 4500 },
  { place: "Korhogo", fee: 5000 },
];

export const deliveryFeeFor = (rates: readonly ShippingRate[], place: string) =>
  rates.find((r) => r.place === place)?.fee ?? 0;

// Adresse complète d'une livraison : repère puis commune
export const orderDeliveryAddress = (order: Pick<Order, "delivery">) =>
  [order.delivery.address, order.delivery.commune].filter(Boolean).join(", ");

// Une commande en cours demande une action de l'admin
export const isOpenOrder = (status: OrderStatus) =>
  status === "en_attente" || status === "en_preparation" || status === "prete";

export const orderSubtotal = (order: Pick<Order, "lines">) =>
  order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

export const orderTotal = (order: Pick<Order, "lines" | "deliveryFee">) =>
  orderSubtotal(order) + order.deliveryFee;

export const orderLineName = (line: Pick<OrderLine, "name" | "variantName">) =>
  line.variantName ? `${line.name} · ${line.variantName}` : line.name;

export const orderLineKey = (line: Pick<OrderLine, "productId" | "variantId">) =>
  `${line.productId}:${line.variantId ?? ""}`;

export const orderItemCount = (order: Pick<Order, "lines">) =>
  order.lines.reduce((sum, line) => sum + line.quantity, 0);
