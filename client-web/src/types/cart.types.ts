export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  price: number; // integer cents
  quantity: number;
  itemTotal: number; // price * quantity in cents
  availableStock: number;
  isAvailable: boolean;
}

export interface FormattedCart {
  id?: string;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number; // integer cents
  estimatedShipping: number; // integer cents
  estimatedTax: number; // integer cents
  total: number; // integer cents
  currency: string;
}

export interface AddToCartPayload {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface MergeCartItemPayload {
  productId: string;
  quantity: number;
}

export interface MergeCartResult {
  cart: FormattedCart;
  warnings: string[];
}

export interface GuestCartPersistedItem {
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  sku: string;
  image?: string;
}

export type CartMode = "guest" | "authenticated";
