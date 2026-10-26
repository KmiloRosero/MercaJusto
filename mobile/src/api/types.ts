// Tipos del dominio — espejan el schema Prisma del backend

export type Role = "BUYER" | "PRODUCER" | "COURIER";

export interface User {
  id: string;
  phone: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  email?: string | null;
  rating: number;
  ratingCount: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  _count?: { products: number };
}

export interface ProducerSummary {
  id: string;
  name: string;
  rating: number;
  ratingCount?: number;
  avatarUrl?: string | null;
  phone?: string;
}

export interface Product {
  id: string;
  producerId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  traditionalPrice?: number | null;
  unit: string;
  stock: number;
  photoUrl?: string | null;
  isSurplus: boolean;
  discountPct: number;
  harvestDate?: string | null;
  vereda?: string | null;
  municipio: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;

  category?: Category;
  producer?: ProducerSummary;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product & { producer?: ProducerSummary };
}

export interface CartResponse {
  items: CartItem[];
  subtotal: number;
  count: number;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

/** WOMPI: pago en línea (Nequi, PSE, tarjeta) · CASH: contraentrega. */
export type PaymentMethod = "WOMPI" | "CASH";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Address {
  id: string;
  label: string;
  municipio: string;
  departamento: string;
  vereda?: string | null;
  detail?: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface Order {
  id: string;
  buyerId: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: string | null;
  deliveryAddressId: string;
  notes?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  items: OrderItem[];
  deliveryAddress?: Address;
  buyer?: ProducerSummary;
  courier?: ProducerSummary;
  reviews?: Review[];
  /** Ruta optimizada del repartidor; solo mientras el pedido va en camino. */
  delivery?: DeliveryView | null;
}

export interface DeliveryView {
  /** Posición de este pedido en la ruta (1 = la primera entrega). */
  position: number;
  stopCount: number;
  /** Minutos estimados desde la salida hasta esta entrega. */
  etaMin: number;
  kmToStop: number;
  zoneLabel: string;
  totalDistanceKm: number;
  /** El comprador solo recibe su parada; repartidor y productor, la ruta completa. */
  stops: { lat: number; lng: number; municipio?: string; mine: boolean }[];
}

export interface Review {
  id: string;
  orderId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface AuthVerifyResponse {
  token: string;
  user: User & {
    addresses: Address[];
    products?: Product[];
  };
}
