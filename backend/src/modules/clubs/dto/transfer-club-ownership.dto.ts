import { IsInt, Min } from 'class-validator';

/** Traspaso de la propiedad del club a otro miembro. */
export class TransferClubOwnershipDto {
  /** Usuario que pasa a ser el nuevo propietario (debe ser miembro del club). */
  @IsInt({ message: 'userId must be an integer' })
  @Min(1, { message: 'userId must be a valid user id' })
  userId: number;
}
