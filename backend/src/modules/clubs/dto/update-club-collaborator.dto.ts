import { IsIn } from 'class-validator';
import { CLUB_COLLABORATOR_ROLES } from './create-club-invitation.dto';
import { ClubMemberRole } from '../entities/club-member.entity';

/** Cambio de permisos de un colaborador ya aceptado en el club. */
export class UpdateClubCollaboratorDto {
  @IsIn([...CLUB_COLLABORATOR_ROLES], { message: 'Invalid collaborator role' })
  role: ClubMemberRole;
}
