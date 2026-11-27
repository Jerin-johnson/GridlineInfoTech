import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CloudinaryService } from './services/cloudinary.service';

const ALLOWED_FOLDERS = new Set([
  'gridline/brands',
  'gridline/categories',
  'gridline/products',
]);

@Controller('uploads')
@UseGuards(RolesGuard)
@Roles('admin')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const targetFolder =
      folder && ALLOWED_FOLDERS.has(folder) ? folder : 'gridline/products';
    const result = await this.cloudinaryService.uploadImage(file, targetFolder);
    return {
      message: 'Image uploaded successfully',
      data: result,
    };
  }
}
