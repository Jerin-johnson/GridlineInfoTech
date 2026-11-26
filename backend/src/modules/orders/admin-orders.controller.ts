import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getAllOrders(@Query() query: AdminOrderQueryDto) {
    const result = await this.ordersService.findAllOrdersForAdmin(query);
    return {
      message: 'Orders retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':orderId')
  async getOrderById(@Param('orderId') orderId: string) {
    const order = await this.ordersService.findOrderByIdForAdmin(orderId);
    return {
      message: 'Order retrieved successfully',
      data: order,
    };
  }

  @Patch(':orderId/status')
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @CurrentUser('sub') adminUserId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateOrderStatusByAdmin(
      orderId,
      adminUserId,
      dto,
    );
    return {
      message: 'Order status updated successfully',
      data: order,
    };
  }
}
