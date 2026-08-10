import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/services/crud.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService extends CrudService<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository);
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    return this.repository.findOne({
      where: { email: email.toLowerCase() },
      select: withPassword
        ? ['id', 'email', 'name', 'password', 'role', 'isActive', 'address', 'phone', 'city', 'createdAt', 'updatedAt']
        : undefined,
    });
  }

  async createWithPassword(email: string, name: string, password: string): Promise<User> {
    const hashed = await bcrypt.hash(password, 10);
    return this.create({ email: email.toLowerCase(), name, password: hashed });
  }

  async update(id: number, data: UpdateUserDto): Promise<User> {
    const payload: Partial<User> = { ...data };
    if (payload.email) payload.email = payload.email.toLowerCase();
    if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
    return super.update(id, payload);
  }

  toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      address: user.address ?? null,
      phone: user.phone ?? null,
      city: user.city ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
