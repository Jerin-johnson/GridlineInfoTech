import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminCustomersService } from './admin-customers.service';
import { AdminCustomerQueryDto } from './dto/admin-customer-query.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';

@Controller('admin/customers')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminCustomersController {
  constructor(private readonly adminCustomersService: AdminCustomersService) {}

  @Get()
  async findAllCustomers(@Query() query: AdminCustomerQueryDto) {
    const result = await this.adminCustomersService.findAllCustomers(query);
    return {
      message: 'Customers retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':customerId')
  async findCustomerById(@Param('customerId') customerId: string) {
    const result =
      await this.adminCustomersService.findCustomerById(customerId);
    return {
      message: 'Customer retrieved successfully',
      data: result,
    };
  }

  @Patch(':customerId/status')
  async updateCustomerStatus(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    const customer = await this.adminCustomersService.updateCustomerStatus(
      customerId,
      dto,
    );
    return {
      message: 'Customer status updated successfully',
      data: customer,
    };
  }
}
