import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResult {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    address: string | null;
    phone: string | null;
    city: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(`Register rejected for ${dto.email}: email already registered`);
      throw new ConflictException('Email is already registered');
    }
    const user = await this.usersService.createWithPassword(
      dto.email,
      dto.name,
      dto.password,
      dto.role ?? UserRole.ADMIN,
      dto.alias,
    );
    this.logger.log(`Registered new user ${dto.email} (id=${user.id})`);
    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user || !user.isActive) {
      this.logger.warn(`Login failed for ${dto.email}: user not found or inactive`);
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      this.logger.warn(`Login failed for ${dto.email}: invalid password`);
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.log(`Login success for ${dto.email} (id=${user.id})`);
    return this.buildAuthResult(user);
  }

  private buildAuthResult(user: User): AuthResult {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    return { user: this.usersService.toSafeUser(user), accessToken };
  }
}