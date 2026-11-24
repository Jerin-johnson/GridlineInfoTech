import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductsService } from '../products/products.service';
import { CART_REPOSITORY } from './constants/cart.constants';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import type { ICartRepository } from './interfaces/cart-repository.interface';
import { FormattedCart, FormattedCartItem } from './interfaces/cart.interface';
import { CartDocument } from './schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
    private readonly productsService: ProductsService,
  ) {}

  async getCart(userId: string): Promise<FormattedCart> {
    const cart = await this.getOrCreateCart(userId);
    return this.formatCart(cart);
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<FormattedCart> {
    if (!Types.ObjectId.isValid(dto.productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const requestedQuantity = dto.quantity ?? 1;
    if (requestedQuantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const product = await this.productsService.findById(dto.productId);
    if (!product || product.status !== 'published') {
      throw new BadRequestException(
        'Product is unavailable or not published for purchase',
      );
    }

    if (product.availableStock <= 0) {
      throw new BadRequestException('Product is currently out of stock');
    }

    const cart = await this.getOrCreateCart(userId);
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === dto.productId,
    );

    if (existingItemIndex > -1) {
      const existingItem = cart.items[existingItemIndex];
      const newTotalQuantity = existingItem.quantity + requestedQuantity;

      if (newTotalQuantity > product.availableStock) {
        throw new BadRequestException(
          `Cannot add ${requestedQuantity} more item(s). You already have ${existingItem.quantity} in cart, and available stock is ${product.availableStock}`,
        );
      }

      existingItem.quantity = newTotalQuantity;
    } else {
      if (requestedQuantity > product.availableStock) {
        throw new BadRequestException(
          `Requested quantity (${requestedQuantity}) exceeds available stock (${product.availableStock})`,
        );
      }

      cart.items.push({
        product: new Types.ObjectId(dto.productId),
        quantity: requestedQuantity,
      });
    }

    const updated = await this.cartRepository.save(cart);
    return this.formatCart(updated);
  }

  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<FormattedCart> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    if (dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) {
      throw new NotFoundException('Product not found in cart');
    }

    const product = await this.productsService.findById(productId);
    if (!product || product.status !== 'published') {
      throw new BadRequestException(
        'Product is unavailable or not published for purchase',
      );
    }

    if (dto.quantity > product.availableStock) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${product.availableStock})`,
      );
    }

    item.quantity = dto.quantity;

    const updated = await this.cartRepository.save(cart);
    return this.formatCart(updated);
  }

  async removeItem(userId: string, productId: string): Promise<FormattedCart> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );

    if (cart.items.length === originalLength) {
      throw new NotFoundException('Product not found in cart');
    }

    const updated = await this.cartRepository.save(cart);
    return this.formatCart(updated);
  }

  async clearCart(userId: string): Promise<FormattedCart> {
    const cleared = await this.cartRepository.clear(userId);
    if (!cleared) {
      const cart = await this.getOrCreateCart(userId);
      cart.items = [];
      const saved = await this.cartRepository.save(cart);
      return this.formatCart(saved);
    }
    return this.formatCart(cleared);
  }

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }
    return cart;
  }

  private async formatCart(cart: CartDocument): Promise<FormattedCart> {
    const formattedItems: FormattedCartItem[] = [];
    let subtotal = 0;
    let totalQuantity = 0;

    for (const item of cart.items) {
      const productId = item.product.toString();
      try {
        const product = await this.productsService.findById(productId);
        const images = Array.isArray(product.images)
          ? (product.images as Array<{ url: string; isPrimary?: boolean }>)
          : [];
        const primaryImage =
          images.find((img) => img.isPrimary)?.url || images[0]?.url;

        const isAvailable =
          product.status === 'published' &&
          product.availableStock >= item.quantity;

        const price = Number(product.price) || 0;
        const itemTotal = price * item.quantity;

        const name = typeof product.name === 'string' ? product.name : '';
        const slug = typeof product.slug === 'string' ? product.slug : '';
        const sku = typeof product.sku === 'string' ? product.sku : '';

        formattedItems.push({
          productId,
          name,
          slug,
          sku,
          image: primaryImage,
          price,
          quantity: item.quantity,
          itemTotal,
          availableStock: product.availableStock,
          isAvailable,
        });

        if (isAvailable) {
          subtotal += itemTotal;
        }
        totalQuantity += item.quantity;
      } catch {
        // Product was removed or archived
        formattedItems.push({
          productId,
          name: 'Unavailable Product',
          slug: '',
          sku: '',
          price: 0,
          quantity: item.quantity,
          itemTotal: 0,
          availableStock: 0,
          isAvailable: false,
        });
        totalQuantity += item.quantity;
      }
    }

    const estimatedShipping = 0; // Minor units placeholder (e.g. standard free shipping)
    const estimatedTax = 0; // Minor units placeholder
    const total = subtotal + estimatedShipping + estimatedTax;

    return {
      id: cart._id ? cart._id.toString() : undefined,
      items: formattedItems,
      itemCount: formattedItems.length,
      totalQuantity,
      subtotal,
      estimatedShipping,
      estimatedTax,
      total,
      currency: 'USD',
    };
  }
}
