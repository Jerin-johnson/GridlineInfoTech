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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async findAll(
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('parent') parent?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: JwtPayload | null,
  ) {
    const isAdmin = user?.role === 'admin';
    const effectiveStatus =
      isAdmin && status === 'all'
        ? undefined
        : isAdmin && (status === 'active' || status === 'inactive')
          ? status
          : 'active';

    let categories = await this.categoriesService.findAll({
      ...(effectiveStatus ? { status: effectiveStatus } : {}),
      ...(parent !== undefined
        ? { parent: parent === 'null' ? null : parent }
        : {}),
    });

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      categories = categories.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
      );
    }

    if (page || limit) {
      const parsedPage = Math.max(1, Number(page) || 1);
      const parsedLimit = Math.min(Math.max(1, Number(limit) || 10), 50);
      const total = categories.length;
      const start = (parsedPage - 1) * parsedLimit;
      const paged = categories.slice(start, start + parsedLimit);
      return {
        message: 'Categories retrieved successfully',
        data: paged,
        meta: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      };
    }

    return {
      message: 'Categories retrieved successfully',
      data: categories,
    };
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const category = await this.categoriesService.findBySlug(slug);
    return {
      message: 'Category retrieved successfully',
      data: category,
    };
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const category = await this.categoriesService.findById(id);
    return {
      message: 'Category retrieved successfully',
      data: category,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(dto);
    return {
      message: 'Category created successfully',
      data: category,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categoriesService.update(id, dto);
    return {
      message: 'Category updated successfully',
      data: category,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deactivate(@Param('id') id: string) {
    const category = await this.categoriesService.deactivate(id);
    return {
      message: 'Category deactivated successfully',
      data: category,
    };
  }
}
