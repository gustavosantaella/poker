import { PartialType } from '@nestjs/mapped-types';
import { CreateGameTypeDto } from './create-game-type.dto';

export class UpdateGameTypeDto extends PartialType(CreateGameTypeDto) {}
