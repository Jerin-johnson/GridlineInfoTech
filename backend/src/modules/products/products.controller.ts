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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  async findAll(
    @Query() query: ProductQueryDto,
    @CurrentUser() user?: JwtPayload | null,
  ) {
    const isAdmin = user?.role === 'admin';
    const result = await this.productsService.findAll(query, isAdmin);
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
  @Get(':id/related')
  async getRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    const parsedLimit = limit ? Math.min(Math.max(1, Number(limit)), 20) : 4;
    const related = await this.productsService.getRelatedProducts(
      id,
      parsedLimit,
    );
    return {
      message: 'Related products retrieved successfully',
      data: related,
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

  @Post(':id/images')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
    @Body('isPrimary') isPrimary?: boolean,
  ) {
    const product = await this.productsService.addImage(
      id,
      file,
      alt,
      isPrimary,
    );
    return {
      message: 'Product image uploaded successfully',
      data: product,
    };
  }

  @Delete(':id/images')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async removeImage(
    @Param('id') id: string,
    @Body('publicId') publicId: string,
  ) {
    const product = await this.productsService.removeImage(id, publicId);
    return {
      message: 'Product image removed successfully',
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
