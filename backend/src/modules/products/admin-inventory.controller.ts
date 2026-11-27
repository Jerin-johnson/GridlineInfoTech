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
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { AdminInventoryQueryDto } from './dto/admin-inventory-query.dto';
import { InventoryMovementQueryDto } from './dto/inventory-movement-query.dto';
import { InventoryService } from './inventory.service';

@Controller('admin/inventory')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory(@Query() query: AdminInventoryQueryDto) {
    const result = await this.inventoryService.getInventoryList(query);
    return {
      message: 'Inventory retrieved successfully',
      data: result.data,
      meta: result.meta,
      summary: result.summary,
    };
  }

  @Get('movements')
  async getMovements(@Query() query: InventoryMovementQueryDto) {
    const result = await this.inventoryService.getMovements(query);
    return {
      message: 'Inventory movements retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Post(':productId/adjust')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Param('productId') productId: string,
    @CurrentUser('sub') adminUserId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    const result = await this.inventoryService.adjustInventory(
      productId,
      adminUserId,
      dto,
    );
    return {
      message: 'Inventory adjusted successfully',
      data: result,
    };
  }
}
