import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(email: string, passwordPlain: string, name: string) {
    const user = await this.usersService.create(email, passwordPlain, name);
    
    // Tokens generated upon successful sign up
    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(email: string, passwordPlain: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordsMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!passwordsMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET') || 'supersecretjwtsignsecretfortoken123',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid session refresh token');
      }

      const tokens = await this.generateTokens(user);
      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(user: UserDocument) {
    const payload = { email: user.email, sub: user._id.toString() };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      aiCreditsRemaining: user.aiCreditsRemaining,
    };
  }
}
