import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { PAYMENT_REPOSITORY } from './constants/payment.constants';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MongoPaymentRepository } from './repositories/mongo-payment.repository';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { BlockchainVerifierService } from './services/blockchain-verifier.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    OrdersModule,
    ProductsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    BlockchainVerifierService,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: MongoPaymentRepository,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
