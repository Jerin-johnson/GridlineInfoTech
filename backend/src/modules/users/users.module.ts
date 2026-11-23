import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_REPOSITORY } from './constants/user.constants';
import { MongoUserRepository } from './repositories/mongo-user.repository';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: MongoUserRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
