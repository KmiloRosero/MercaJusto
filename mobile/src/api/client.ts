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
// - iOS Simulator: localhost funciona
// - Dispositivo físico: usa la IP LAN de tu máquina (ej. 192.168.0.x)

const DEFAULT_API = Constants.expoConfig?.extra?.apiUrl || "http://localhost:4000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API;

const TOKEN_KEY = "mercajusto.token";

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
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

export async function getUser(id: string): Promise<User & { products?: Product[] }> {
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
// CATEGORIES & PRODUCTS
// ═══════════════════════════════════════════

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get("/categories");
  return data;
}

export interface ProductFilters {
  category?: string;
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

export async function uploadImage(uri: string): Promise<string> {
  const filename = uri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  const form = new FormData();
  // React Native acepta este shape para archivos en FormData
  form.append("file", { uri, name: filename, type } as unknown as Blob);

  const { data } = await api.post<{ url: string }>("/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
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
// ERRORS
// ═══════════════════════════════════════════

export function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error || err.message || "Error de conexión";
  }
  if (err instanceof Error) return err.message;
  return "Error inesperado";
}
