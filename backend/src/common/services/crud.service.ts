import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { Paginated } from '../types/paginated';

export interface CrudOptions<T> {
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  relations?: string[];
  order?: { [P in keyof T]?: 'ASC' | 'DESC' };
  page?: number;
  limit?: number;
}

/**
 * Servicio CRUD generico reutilizable por todos los modulos.
 * Proporciona create / findAll / findOne / update / remove con
 * paginacion, relaciones y manejo de errores de unicidad.
 */
export abstract class CrudService<T extends { id: number }> {
  constructor(protected readonly repository: Repository<T>) {}

  async create(data: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      this.handleDuplicate(error);
      throw error;
    }
  }

  async findAll(options: CrudOptions<T> = {}): Promise<Paginated<T>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const [items, total] = await this.repository.findAndCount({
      where: options.where,
      relations: options.relations,
      order: (options.order ?? { id: 'DESC' }) as FindOptionsOrder<T>,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: number, relations?: string[]): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations,
    });
    if (!entity) {
      throw new NotFoundException(`Resource with id ${id} was not found`);
    }
    return entity;
  }

  async update(id: number, data: DeepPartial<T>): Promise<T> {
    await this.findOne(id);
    try {
      await this.repository.update(id, data as any);
    } catch (error) {
      this.handleDuplicate(error);
      throw error;
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
  }

  protected handleDuplicate(error: unknown): void {
    if (
      error &&
      typeof error === 'object' &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('A record with the same unique value already exists');
    }
  }
}