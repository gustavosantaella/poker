import { IsIn } from 'class-validator';

export class UpdateClubMemberDto {
  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
