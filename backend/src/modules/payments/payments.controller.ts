import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('config')
  getConfig() {
    const config = this.paymentsService.getPublicConfig();
    return {
      message: 'Payment configuration retrieved successfully',
      data: config,
    };
  }

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @CurrentUser('sub') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    const payment = await this.paymentsService.initiatePayment(userId, dto);
    return {
      message: 'Payment initiated successfully',
      data: payment,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    const payment = await this.paymentsService.verifyPayment(userId, dto);
    return {
      message:
        payment.verificationStatus === 'verified'
          ? 'Payment verified successfully'
          : 'Payment is awaiting blockchain confirmations',
      data: payment,
    };
  }

  @Get('order/:orderId')
  async getPaymentByOrder(
    @CurrentUser('sub') userId: string,
    @Param('orderId') orderId: string,
  ) {
    const payment = await this.paymentsService.getPaymentByOrder(
      userId,
      orderId,
    );
    return {
      message: 'Payment details retrieved successfully',
      data: payment,
    };
  }
}
