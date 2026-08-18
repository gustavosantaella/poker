import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import { del, put, PutBlobResult } from '@vercel/blob';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION = 4096; // 4096x4096 px máximo
const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com';

/** Detecta el tipo real por magic bytes (no confía en el mimetype enviado). */
function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** ¿Es una URL alojada en Vercel Blob? (para poder borrar avatares anteriores). */
function isBlobUrl(url: string): boolean {
  return url.includes(BLOB_HOST_SUFFIX);
}

@Controller('uploads')
export class UploadsController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Credenciales de Vercel Blob.
   *
   * Autenticación preferente: OIDC (`VERCEL_OIDC_TOKEN`). El SDK lo detecta solo:
   *  - en local, desde la variable de entorno `VERCEL_OIDC_TOKEN`;
   *  - en Vercel Functions, desde el header `x-vercel-oidc-token`.
   * Para OIDC es obligatorio indicar el store (`BLOB_STORE_ID`).
   *
   * Respaldo: token de lectura/escritura `BLOB_READ_WRITE_TOKEN` (código fuera de Vercel).
   */
  private blobAuth(): { token?: string; storeId?: string } {
    const storeId = this.config.get<string>('blob.storeId')?.trim() ?? '';
    if (storeId) {
      return { storeId };
    }
    const readWriteToken = this.config.get<string>('blob.readWriteToken')?.trim() ?? '';
    return readWriteToken ? { token: readWriteToken } : {};
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      // El archivo se procesa en memoria y se sube a Vercel Blob (no se guarda en disco).
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 1) Validar magic bytes (evita subir archivos disfrazados de imagen).
    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException('Only image files are allowed (jpeg, png, webp)');
    }

    let processed: Buffer;
    try {
      // 2) Re-encode con sharp: elimina contenido malicioso, normaliza formato y valida dimensiones.
      const image = sharp(file.buffer, { failOn: 'error' }).rotate();
      const metadata = await image.metadata();
      if ((metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION) {
        throw new BadRequestException(`Image is too large (max ${MAX_DIMENSION}x${MAX_DIMENSION}px)`);
      }
      processed = await image
        .resize({ width: metadata.width!, height: metadata.height!, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    const auth = this.blobAuth();

    // 3) Subir a Vercel Blob: almacenamiento externo persistente y servido por CDN.
    let blob: PutBlobResult;
    try {
      blob = await put(`avatars/avatar-${randomUUID()}.jpg`, processed, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: true,
        ...auth,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Image upload failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    // 4) Borrar el avatar anterior (Blob o legacy local) sin bloquear la subida.
    await this.removePreviousAvatar(user.photoUrl, auth);

    return { url: blob.url };
  }

  private async removePreviousAvatar(
    photoUrl: string | null | undefined,
    auth: { token?: string; storeId?: string },
  ): Promise<void> {
    if (!photoUrl) return;
    try {
      if (isBlobUrl(photoUrl)) {
        await del(photoUrl, auth);
      } else if (photoUrl.startsWith('/uploads/')) {
        // Legacy: archivos locales subidos antes de migrar a Vercel Blob.
        const oldPath = join(process.cwd(), photoUrl.replace(/^\//, ''));
        if (existsSync(oldPath)) unlinkSync(oldPath);
      }
    } catch {
      // Si el blob anterior ya no existe o no se puede borrar, no se bloquea la subida.
    }
  }
}

