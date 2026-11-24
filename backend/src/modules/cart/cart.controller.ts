import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser('sub') userId: string) {
    const cart = await this.cartService.getCart(userId);
    return {
      message: 'Cart retrieved successfully',
      data: cart,
    };
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(@CurrentUser('sub') userId: string, @Body() dto: AddToCartDto) {
    const cart = await this.cartService.addItem(userId, dto);
    return {
      message: 'Item added to cart successfully',
      data: cart,
    };
  }

  @Patch('items/:productId')
  async updateItem(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateItem(userId, productId, dto);
    return {
      message: 'Cart item updated successfully',
      data: cart,
    };
  }

  @Delete('items/:productId')
  async removeItem(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    const cart = await this.cartService.removeItem(userId, productId);
    return {
      message: 'Cart item removed successfully',
      data: cart,
    };
  }

  @Delete()
  async clearCart(@CurrentUser('sub') userId: string) {
    const cart = await this.cartService.clearCart(userId);
    return {
      message: 'Cart cleared successfully',
      data: cart,
    };
  }
}
