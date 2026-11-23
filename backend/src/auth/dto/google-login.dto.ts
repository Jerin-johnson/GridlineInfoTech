import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Google credential (ID token) is required' })
  credential!: string;
}
