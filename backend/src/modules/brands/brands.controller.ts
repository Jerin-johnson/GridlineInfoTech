import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  async findAll(@Query('status') status?: 'active' | 'inactive') {
    const brands = await this.brandsService.findAll({
      status: status ?? 'active',
    });
    return {
      message: 'Brands retrieved successfully',
      data: brands,
    };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const brand = await this.brandsService.findBySlug(slug);
    return {
      message: 'Brand retrieved successfully',
      data: brand,
    };
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const brand = await this.brandsService.findById(id);
    return {
      message: 'Brand retrieved successfully',
      data: brand,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBrandDto) {
    const brand = await this.brandsService.create(dto);
    return {
      message: 'Brand created successfully',
      data: brand,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const brand = await this.brandsService.update(id, dto);
    return {
      message: 'Brand updated successfully',
      data: brand,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deactivate(@Param('id') id: string) {
    const brand = await this.brandsService.deactivate(id);
    return {
      message: 'Brand deactivated successfully',
      data: brand,
    };
  }
}
