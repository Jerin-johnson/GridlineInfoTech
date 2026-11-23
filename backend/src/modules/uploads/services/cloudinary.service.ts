import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import {
  IImageUploadService,
  ImageUploadResult,
} from '../interfaces/image-upload-service.interface';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class CloudinaryService implements IImageUploadService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'Cloudinary credentials not provided. Mock fallback mode enabled for development/testing.',
      );
      this.isConfigured = false;
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'gridline/products',
  ): Promise<ImageUploadResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('No file provided or file buffer is empty');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }

    if (!this.isConfigured) {
      const mockPublicId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return {
        url: `https://res.cloudinary.com/mock-cloud/image/upload/${folder}/${mockPublicId}.jpg`,
        publicId: `${folder}/${mockPublicId}`,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload stream error', error);
            return reject(
              new BadRequestException(
                `Image upload failed: ${error?.message || 'Unknown provider error'}`,
              ),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;

    if (!this.isConfigured) {
      this.logger.log(`[Mock] Deleted Cloudinary image: ${publicId}`);
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(
        `Failed to delete Cloudinary image: ${publicId}`,
        error,
      );
    }
  }
}
