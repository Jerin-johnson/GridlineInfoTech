export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  unitPrice: number; // integer cents
  quantity: number;
  lineTotal: number; // integer cents
  availableStock: number;
  inStock: boolean;
}

export interface FormattedCart {
  id: string;
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
