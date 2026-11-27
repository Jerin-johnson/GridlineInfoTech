import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PRODUCT_REPOSITORY } from './constants/product.constants';
import { AdminInventoryController } from './admin-inventory.controller';
import { InventoryService } from './inventory.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { MongoProductRepository } from './repositories/mongo-product.repository';
import {
  InventoryMovement,
  InventoryMovementSchema,
} from './schemas/inventory-movement.schema';
import { Product, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    AuthModule,
    CategoriesModule,
    BrandsModule,
    UploadsModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
    ]),
  ],
  controllers: [ProductsController, AdminInventoryController],
  providers: [
    ProductsService,
    InventoryService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: MongoProductRepository,
    },
  ],
  exports: [ProductsService, InventoryService],
})
export class ProductsModule {}
