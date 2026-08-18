import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'avatars');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION = 4096; // 4096x4096 px máximo

/** Detecta el tipo real por magic bytes (no confía en el mimetype enviado). */
function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

@Controller('uploads')
export class UploadsController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          // Nombre aleatorio (UUID): no se puede adivinar ni sobrescribir archivos ajenos.
          cb(null, `avatar-${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 1) Validar magic bytes (evita subir archivos disfrazados de imagen).
    // Multer con diskStorage no expone el buffer; leemos el archivo ya escrito.
    const { readFileSync } = await import('fs');
    const raw = readFileSync(file.path);
    const detected = detectImageType(raw);
    if (!detected) {
      unlinkSync(file.path);
      throw new BadRequestException('Only image files are allowed (jpeg, png, webp)');
    }

    try {
      // 2) Re-encode con sharp: elimina contenido malicioso, normaliza formato y valida dimensiones.
      const image = sharp(raw, { failOn: 'error' }).rotate();
      const metadata = await image.metadata();
      if ((metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION) {
        throw new BadRequestException(`Image is too large (max ${MAX_DIMENSION}x${MAX_DIMENSION}px)`);
      }
      await image
        .resize({ width: metadata.width!, height: metadata.height!, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toFile(file.path);

      // 3) Borrar el avatar anterior del usuario si es local.
      if (user.photoUrl?.startsWith('/uploads/')) {
        const oldPath = join(process.cwd(), user.photoUrl.replace(/^\//, ''));
        if (oldPath !== file.path && existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
          } catch {
            // Archivo ausente o en uso: se ignora, no bloquea la subida.
          }
        }
      }

      return { url: `/uploads/avatars/${file.filename}` };
    } catch (error) {
      try {
        unlinkSync(file.path);
      } catch {
        /* noop */
      }
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('The uploaded file is not a valid image');
    }
  }
}
