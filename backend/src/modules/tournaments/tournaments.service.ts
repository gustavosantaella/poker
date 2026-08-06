import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial } from 'typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { buildBlindStructure } from './blind-structure.builder';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { GenerateStructureDto } from './dto/blind-structure.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { BlindStructureItem, BuildBlindStructureParams } from './types/blind-structure';

@Injectable()
export class TournamentsService extends CrudService<Tournament> {
  constructor(@InjectRepository(Tournament) repository: Repository<Tournament>) {
    super(repository);
  }

  async create(data: DeepPartial<Tournament>): Promise<Tournament> {
    const dto = data as unknown as CreateTournamentDto;
    this.validateOptions(dto);
    const { blindStructure, blindConfig, ...rest } = dto;
    const structure =
      (blindStructure as BlindStructureItem[] | undefined) ??
      (blindConfig ? buildBlindStructure(blindConfig as BuildBlindStructureParams).items : null);
    if (!structure || structure.length === 0) {
      throw new BadRequestException(
        'Either blindConfig or blindStructure is required to build the blind levels',
      );
    }
    return super.create({
      ...rest,
      blindStructure: structure,
      blindConfig: blindConfig ?? null,
    } as DeepPartial<Tournament>);
  }

  async update(id: number, data: DeepPartial<Tournament>): Promise<Tournament> {
    const dto = data as unknown as UpdateTournamentDto;
    const current = await this.findOne(id);
    this.validateOptions({ ...current, ...dto } as unknown as CreateTournamentDto);

    const { blindStructure, blindConfig, ...rest } = dto;
    let nextStructure = current.blindStructure;
    if (blindStructure) {
      nextStructure = blindStructure as BlindStructureItem[];
    } else if (blindConfig) {
      nextStructure = buildBlindStructure(blindConfig as BuildBlindStructureParams).items;
    }

    return super.update(id, {
      ...rest,
      blindStructure: nextStructure,
      blindConfig: blindConfig ?? current.blindConfig,
    } as DeepPartial<Tournament>);
  }

  generateStructure(params: GenerateStructureDto) {
    return buildBlindStructure(params as BuildBlindStructureParams);
  }

  private validateOptions(dto: Partial<CreateTournamentDto>): void {
    if (
      dto.paidPlacesType === 'percent' &&
      dto.paidPlacesValue !== undefined &&
      dto.paidPlacesValue !== null &&
      dto.paidPlacesValue > 100
    ) {
      throw new BadRequestException('paidPlacesValue cannot exceed 100 when using percent');
    }
    if (
      dto.adminFeeType === 'percent' &&
      dto.adminFeeValue !== undefined &&
      dto.adminFeeValue !== null &&
      dto.adminFeeValue > 100
    ) {
      throw new BadRequestException('adminFeeValue cannot exceed 100 when using percent');
    }
    if (dto.reEntryEnabled && (dto.maxReEntries === undefined || dto.maxReEntries === null || dto.maxReEntries < 0)) {
      throw new BadRequestException('maxReEntries is required when re-entry is enabled');
    }
    if (
      dto.lateRegistrationEnabled &&
      (dto.lateRegistrationUntilLevel === undefined || dto.lateRegistrationUntilLevel === null || dto.lateRegistrationUntilLevel < 1)
    ) {
      throw new BadRequestException('lateRegistrationUntilLevel is required when late registration is enabled');
    }
    if (dto.addOnEnabled) {
      if (dto.addOnAmount === undefined || dto.addOnAmount === null || dto.addOnAmount < 0) {
        throw new BadRequestException('addOnAmount is required when add-on is enabled');
      }
      if (dto.addOnStack === undefined || dto.addOnStack === null || dto.addOnStack < 1) {
        throw new BadRequestException('addOnStack is required when add-on is enabled');
      }
      if (dto.addOnUntilLevel === undefined || dto.addOnUntilLevel === null || dto.addOnUntilLevel < 1) {
        throw new BadRequestException('addOnUntilLevel is required when add-on is enabled');
      }
    }
  }
}