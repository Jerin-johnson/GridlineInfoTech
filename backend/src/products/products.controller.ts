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
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    const result = await this.productsService.findAll(query);
    return {
      message: 'Products retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    return {
      message: 'Product retrieved successfully',
      data: product,
    };
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findById(id);
    return {
      message: 'Product retrieved successfully',
      data: product,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto);
    return {
      message: 'Product created successfully',
      data: product,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const product = await this.productsService.update(id, dto);
    return {
      message: 'Product updated successfully',
      data: product,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async archive(@Param('id') id: string) {
    const product = await this.productsService.archive(id);
    return {
      message: 'Product archived successfully',
      data: product,
    };
  }
}
