import {
  BadRequestException,
  Body,
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

/** Carpetas permitidas en el almacenamiento (evita rutas arbitrarias). */
const ALLOWED_FOLDERS = ['avatars', 'clubs'] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];
const FOLDER_PREFIX: Record<UploadFolder, string> = { avatars: 'avatar', clubs: 'club' };

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

  /**
   * Valida la imagen (magic bytes + re-encode con sharp) y devuelve el buffer
   * normalizado en JPEG. Lanza BadRequest si el archivo no es una imagen válida.
   */
  private async processImage(file: Express.Multer.File | undefined): Promise<Buffer> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 1) Validar magic bytes (evita subir archivos disfrazados de imagen).
    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException('Only image files are allowed (jpeg, png, webp)');
    }

    try {
      // 2) Re-encode con sharp: elimina contenido malicioso, normaliza formato y valida dimensiones.
      const image = sharp(file.buffer, { failOn: 'error' }).rotate();
      const metadata = await image.metadata();
      if ((metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION) {
        throw new BadRequestException(`Image is too large (max ${MAX_DIMENSION}x${MAX_DIMENSION}px)`);
      }
      return await image
        .resize({ width: metadata.width!, height: metadata.height!, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('The uploaded file is not a valid image');
    }
  }

  /** 3) Sube la imagen procesada a Vercel Blob (almacenamiento persistente servido por CDN). */
  private async storeImage(folder: UploadFolder, buffer: Buffer): Promise<PutBlobResult> {
    try {
      return await put(`${folder}/${FOLDER_PREFIX[folder]}-${randomUUID()}.jpg`, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: true,
        ...this.blobAuth(),
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Image upload failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
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
    const processed = await this.processImage(file);
    const blob = await this.storeImage('avatars', processed);

    // 4) Borrar el avatar anterior (Blob o legacy local) sin bloquear la subida.
    await this.removePreviousAvatar(user.photoUrl, this.blobAuth());

    return { url: blob.url };
  }

  /**
   * Subida genérica de imágenes (foto de club, avatares...). No toca el perfil del
   * usuario autenticado: el cliente indica el destino con `folder` y, si reemplaza
   * una imagen anterior, la envía en `previousUrl` para borrarla del almacenamiento.
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('previousUrl') previousUrl?: string,
  ) {
    const target: UploadFolder = ALLOWED_FOLDERS.includes(folder as UploadFolder)
      ? (folder as UploadFolder)
      : 'avatars';
    const processed = await this.processImage(file);
    const blob = await this.storeImage(target, processed);

    // Solo borra blobs de la MISMA carpeta: nunca la imagen de otro recurso.
    if (previousUrl && isBlobUrl(previousUrl) && previousUrl.includes(`/${target}/`)) {
      try {
        await del(previousUrl, this.blobAuth());
      } catch {
        // Si el blob anterior ya no existe, no se bloquea la subida.
      }
    }

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

