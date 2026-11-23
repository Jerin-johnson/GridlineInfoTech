import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CATEGORY_REPOSITORY } from './constants/category.constants';
import { MongoCategoryRepository } from './repositories/mongo-category.repository';
import { Category, CategorySchema } from './schemas/category.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: MongoCategoryRepository,
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
