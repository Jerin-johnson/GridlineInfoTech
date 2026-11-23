import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BRAND_REPOSITORY } from './constants/brand.constants';
import { MongoBrandRepository } from './repositories/mongo-brand.repository';
import { Brand, BrandSchema } from './schemas/brand.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
  ],
  controllers: [BrandsController],
  providers: [
    BrandsService,
    {
      provide: BRAND_REPOSITORY,
      useClass: MongoBrandRepository,
    },
  ],
  exports: [BrandsService],
})
export class BrandsModule {}
