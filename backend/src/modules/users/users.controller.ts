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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser('sub') userId: string) {
    const profile = await this.usersService.getProfile(userId);
    return {
      message: 'User profile retrieved successfully',
      data: profile,
    };
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(userId, dto);
    return {
      message: 'User profile updated successfully',
      data: profile,
    };
  }

  @Get('me/addresses')
  async getAddresses(@CurrentUser('sub') userId: string) {
    const addresses = await this.usersService.getAddresses(userId);
    return {
      message: 'Addresses retrieved successfully',
      data: addresses,
    };
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  async addAddress(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    const addresses = await this.usersService.addAddress(userId, dto);
    return {
      message: 'Address added successfully',
      data: addresses,
    };
  }

  @Patch('me/addresses/:addressId/default')
  async setDefaultAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId') addressId: string,
  ) {
    const addresses = await this.usersService.setDefaultAddress(
      userId,
      addressId,
    );
    return {
      message: 'Default address updated successfully',
      data: addresses,
    };
  }

  @Patch('me/addresses/:addressId')
  async updateAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const addresses = await this.usersService.updateAddress(
      userId,
      addressId,
      dto,
    );
    return {
      message: 'Address updated successfully',
      data: addresses,
    };
  }

  @Delete('me/addresses/:addressId')
  async deleteAddress(
    @CurrentUser('sub') userId: string,
    @Param('addressId') addressId: string,
  ) {
    const addresses = await this.usersService.deleteAddress(userId, addressId);
    return {
      message: 'Address deleted successfully',
      data: addresses,
    };
  }
}
