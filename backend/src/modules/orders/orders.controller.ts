import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders(
    @CurrentUser('sub') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    const result = await this.ordersService.findUserOrders(userId, query);
    return {
      message: 'Orders retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':orderId')
  async getOrderById(
    @CurrentUser('sub') userId: string,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.ordersService.findUserOrderById(userId, orderId);
    return {
      message: 'Order retrieved successfully',
      data: order,
    };
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser('sub') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    const order = await this.ordersService.cancelOrder(userId, orderId, dto);
    return {
      message: 'Order cancelled successfully',
      data: order,
    };
  }
}
