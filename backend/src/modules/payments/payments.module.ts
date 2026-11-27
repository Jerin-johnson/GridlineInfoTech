import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
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
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    PaymentsService,
    AdminPaymentsService,
    BlockchainVerifierService,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: MongoPaymentRepository,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
