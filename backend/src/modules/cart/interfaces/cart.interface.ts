export interface FormattedCartItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  price: number; // Unit price in cents
  quantity: number;
  itemTotal: number; // price * quantity in cents
  availableStock: number;
  isAvailable: boolean;
}

export interface FormattedCart {
  id?: string;
  items: FormattedCartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number; // in cents
  estimatedShipping: number; // in cents
  estimatedTax: number; // in cents
  total: number; // subtotal + shipping + tax
  currency: string;
}
