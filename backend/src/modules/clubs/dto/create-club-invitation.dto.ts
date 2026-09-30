import { IsEmail, IsIn, MaxLength } from 'class-validator';
import { ClubMemberRole } from '../entities/club-member.entity';

/** Roles que el admin del club puede asignar a un colaborador invitado. */
export const CLUB_COLLABORATOR_ROLES = [
  ClubMemberRole.ADMIN,
  ClubMemberRole.OPERATOR,
  ClubMemberRole.CASHIER,
];

export class CreateClubInvitationDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;

  @IsIn([...CLUB_COLLABORATOR_ROLES], { message: 'Invalid collaborator role' })
  role: ClubMemberRole;
}
