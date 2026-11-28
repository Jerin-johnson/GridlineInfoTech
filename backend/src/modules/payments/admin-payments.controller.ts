import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { ReconcilePaymentDto } from './dto/reconcile-payment.dto';

@Controller('admin/payments')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get('summary')
  async getSummary() {
    const summary = await this.adminPaymentsService.getSummary();
    return {
      message: 'Payment summary retrieved successfully',
      data: summary,
    };
  }

  @Get()
  async findAllTransactions(@Query() query: AdminPaymentQueryDto) {
    const result = await this.adminPaymentsService.findAllTransactions(query);
    return {
      message: 'Payments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':transactionId')
  async findTransactionById(@Param('transactionId') transactionId: string) {
    const detail =
      await this.adminPaymentsService.findTransactionById(transactionId);
    return {
      message: 'Payment details retrieved successfully',
      data: detail,
    };
  }

  @Post(':transactionId/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcileTransaction(
    @Param('transactionId') transactionId: string,
    @Body() dto: ReconcilePaymentDto,
    @CurrentUser('sub') adminUserId: string,
  ) {
    const detail = await this.adminPaymentsService.reconcileTransaction(
      transactionId,
      dto,
      adminUserId,
    );
    return {
      message:
        dto.action === 'fulfill'
          ? 'Expired payment reconciled and order fulfilled'
          : 'Expired payment reconciled and refund recorded',
      data: detail,
    };
  }
}
