import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersService } from './orders.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async checkout(@CurrentUser('sub') userId: string, @Body() dto: CheckoutDto) {
    const order = await this.ordersService.checkout(userId, dto);
    return {
      message: 'Order created successfully',
      data: order,
    };
  }
}
