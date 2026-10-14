import { Platform } from "react-native";
import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import {
  Address,
  AuthVerifyResponse,
  CartItem,
  CartResponse,
  Category,
  Order,
  PaymentMethod,
  Product,
  User,
} from "./types";

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════
// - Android Emulator: usa 10.0.2.2 en vez de localhost
// - Dispositivo físico: usa la IP LAN del servidor Expo
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const defaultHost =
  Platform.OS === "android"
    ? Constants.isDevice && expoHost
      ? expoHost
      : "10.0.2.2"
    : Platform.OS === "ios" && Constants.isDevice && expoHost
      ? expoHost
      : "localhost";
const DEFAULT_API = Constants.expoConfig?.extra?.apiUrl || `http://${defaultHost}:4000`;

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API;

const TOKEN_KEY = "mercajusto.token";

export const tokenStorage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  set: async (t: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, t);
      } catch {}
      return;
    }
    return SecureStore.setItemAsync(TOKEN_KEY, t);
  },
  clear: async (): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
      } catch {}
      return;
    }
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira a mitad de sesión, el store de auth cierra la sesión.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const url = err.config?.url ?? "";
    const hadToken = Boolean(err.config?.headers?.Authorization);
    if (err.response?.status === 401 && hadToken && !url.startsWith("/auth")) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════

export async function requestOtp(phone: string): Promise<{ message: string; devCode?: string }> {
  const { data } = await api.post("/auth/otp", { phone });
  return data;
}

export async function verifyOtp(
  phone: string,
  code: string,
  extra?: { name?: string; role?: "BUYER" | "PRODUCER" }
): Promise<AuthVerifyResponse> {
  const { data } = await api.post("/auth/verify", { phone, code, ...extra });
  await tokenStorage.set(data.token);
  return data;
}

export async function logout(): Promise<void> {
  await tokenStorage.clear();
}

// ═══════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════

export interface MeResponse extends User {
  addresses: Address[];
  products?: Product[];
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get("/users/me");
  return data;
}

export interface PublicProfile extends User {
  products?: Product[];
  municipios?: string[];
  reviewsReceived?: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    fromUser: { id: string; name: string };
  }>;
}

export async function getUser(id: string): Promise<PublicProfile> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

// ═══════════════════════════════════════════
// ADDRESSES
// ═══════════════════════════════════════════

export interface CreateAddressInput {
  label?: string;
  municipio: string;
  departamento?: string;
  vereda?: string;
  detail?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const { data } = await api.post("/users/me/addresses", input);
  return data;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/users/me/addresses/${id}`);
}

// ═══════════════════════════════════════════
// PUSH TOKENS
// ═══════════════════════════════════════════

export async function registerPushToken(
  token: string,
  platform: "ios" | "android" | "web" | "unknown" = "unknown"
): Promise<void> {
  await api.post("/users/me/push-token", { token, platform });
}

export async function unregisterPushToken(token?: string): Promise<void> {
  await api.delete("/users/me/push-token", { params: token ? { token } : undefined });
}

// ═══════════════════════════════════════════
// CATEGORIES & PRODUCTS
// ═══════════════════════════════════════════

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get("/categories");
  return data;
}

export interface ProductFilters {
  category?: string;
  producerId?: string;
  municipio?: string;
  surplus?: boolean;
  search?: string;
  sort?: "recent" | "price_asc" | "price_desc" | "rating";
  limit?: number;
}

export async function getProducts(filters: ProductFilters = {}): Promise<{
  count: number;
  products: Product[];
}> {
  const params: Record<string, unknown> = { ...filters };
  if (filters.surplus !== undefined) params.surplus = String(filters.surplus);
  const { data } = await api.get("/products", { params });
  return data;
}

export async function getProduct(id: string): Promise<Product & { reviews?: unknown[] }> {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  traditionalPrice?: number;
  unit: string;
  stock: number;
  photoUrl?: string;
  isSurplus?: boolean;
  discountPct?: number;
  vereda?: string;
  municipio: string;
  latitude: number;
  longitude: number;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post("/products", input);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ═══════════════════════════════════════════
// UPLOADS
// ═══════════════════════════════════════════

export async function uploadImage(uri: string, mimeType?: string | null): Promise<string> {
  const form = new FormData();

  if (Platform.OS === "web") {
    // En web el picker devuelve un blob:/data: URI → lo convertimos a Blob real
    const blob = await (await fetch(uri)).blob();
    const type = mimeType || blob.type || "image/jpeg";
    const ext = type.split("/")[1] === "png" ? "png" : type.split("/")[1] === "webp" ? "webp" : "jpg";
    form.append("file", new Blob([blob], { type }), `photo.${ext}`);
  } else {
    const filename = uri.split("/").pop() || "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const ext = match?.[1]?.toLowerCase();
    const type =
      mimeType || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
    // React Native acepta este shape para archivos en FormData
    form.append("file", { uri, name: filename, type } as unknown as Blob);
  }

  // En web el navegador debe poner el Content-Type (con su boundary) por sí mismo
  const { data } = await api.post<{ url: string }>("/uploads", form, {
    headers: Platform.OS === "web" ? undefined : { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });
  return data.url;
}

// ═══════════════════════════════════════════
// CART
// ═══════════════════════════════════════════

export async function getCart(): Promise<CartResponse> {
  const { data } = await api.get("/cart");
  return data;
}

export async function addToCart(productId: string, quantity = 1): Promise<CartItem> {
  const { data } = await api.post("/cart/items", { productId, quantity });
  return data;
}

export async function updateCartItem(id: string, quantity: number): Promise<unknown> {
  const { data } = await api.patch(`/cart/items/${id}`, { quantity });
  return data;
}

export async function clearCart(): Promise<void> {
  await api.delete("/cart");
}

// ═══════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await api.get("/orders/mine");
  return data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get(`/orders/${id}`);
  return data;
}

export async function createOrder(input: {
  deliveryAddressId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}): Promise<Order> {
  const { data } = await api.post("/orders", input);
  return data;
}

export async function createReview(
  orderId: string,
  input: { rating: number; comment?: string; toUserId: string }
): Promise<unknown> {
  const { data } = await api.post(`/orders/${orderId}/reviews`, input);
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order["status"]
): Promise<Order> {
  const { data } = await api.patch(`/orders/${orderId}/status`, { status });
  return data;
}

// ═══════════════════════════════════════════
// MÉTRICAS — precio justo (ahorro del comprador / ingresos del productor)
// ═══════════════════════════════════════════

export interface FairPriceMetrics {
  ordersCount: number;
  itemsCount: number;
  totals: {
    buyerPaidTotal: number;
    producerRevenue: number;
    traditionalTotal: number;
    buyerSavingsTotal: number;
    buyerSavingsPct: number;
    avgTicket: number;
    surplusUnits: number;
  };
}

export async function getFairPriceMetrics(): Promise<FairPriceMetrics> {
  const { data } = await api.get("/metrics/fair-price");
  return data;
}

// ═══════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════

export function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (!err.response) {
      return `No se pudo conectar con el servidor (${API_URL}). Verifica que el backend esté encendido y en la misma red.`;
    }
    return err.message || "Error de conexión";
  }
  if (err instanceof Error) return err.message;
  return "Error inesperado";
}
