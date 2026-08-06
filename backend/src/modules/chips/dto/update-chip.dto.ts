import { PartialType } from '@nestjs/mapped-types';
import { CreateChipDto } from './create-chip.dto';

export class UpdateChipDto extends PartialType(CreateChipDto) {}
