/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from '../services/cloudinary.service';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return undefined;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException if no file or buffer is provided', async () => {
    await expect(
      service.uploadImage({} as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for invalid mimetype', async () => {
    const invalidFile = {
      buffer: Buffer.from('test text'),
      mimetype: 'text/plain',
      size: 100,
    } as Express.Multer.File;

    await expect(service.uploadImage(invalidFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if file size exceeds 5MB', async () => {
    const oversizedFile = {
      buffer: Buffer.from('oversized data'),
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024,
    } as Express.Multer.File;

    await expect(service.uploadImage(oversizedFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should successfully upload image in fallback mode', async () => {
    const validFile = {
      buffer: Buffer.from('fake image content'),
      mimetype: 'image/png',
      size: 1024,
    } as Express.Multer.File;

    const result = await service.uploadImage(validFile, 'gridline/products');
    expect(result.url).toContain('https://res.cloudinary.com/');
    expect(result.publicId).toBeDefined();
  });

  it('should handle delete image without errors', async () => {
    await expect(
      service.deleteImage('sample_public_id'),
    ).resolves.not.toThrow();
  });
});
