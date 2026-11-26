import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { CheckoutController } from './checkout.controller';
import { ORDER_REPOSITORY } from './constants/order.constants';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MongoOrderRepository } from './repositories/mongo-order.repository';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CartModule,
    ProductsModule,
    UsersModule,
  ],
  controllers: [CheckoutController, OrdersController],
  providers: [
    OrdersService,
    {
      provide: ORDER_REPOSITORY,
      useClass: MongoOrderRepository,
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
