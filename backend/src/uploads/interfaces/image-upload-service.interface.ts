export interface ImageUploadResult {
  url: string;
  publicId: string;
}

export interface IImageUploadService {
  uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<ImageUploadResult>;
  deleteImage(publicId: string): Promise<void>;
}
