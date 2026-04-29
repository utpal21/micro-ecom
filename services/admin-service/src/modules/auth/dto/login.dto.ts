import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'Admin user email address',
        example: 'admin@example.com',
        type: String,
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Admin user password',
        example: 'Admin@123',
        type: String,
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    password: string;
}
