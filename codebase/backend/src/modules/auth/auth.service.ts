import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return a generic response to prevent email enumeration.
    if (!user) {
      return { message: 'If an account exists for this email, password reset instructions have been sent.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await this.usersService.setResetPasswordToken(user._id.toString(), tokenHash, expiresAt);
    await this.mailService.sendPasswordResetEmail(user.email, resetLink);

    const response: Record<string, string> = {
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };

    // Dev helper for local testing when SMTP is not configured.
    if ((process.env.NODE_ENV || 'development') !== 'production' && !this.mailService.isEnabled()) {
      response.resetToken = rawToken;
    }

    return response;
  }

  async resetPassword(token: string, passwordPlain: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(user._id.toString(), passwordPlain);
    await this.usersService.clearResetPasswordToken(user._id.toString());

    return { message: 'Password reset successful. You can now sign in with your new password.' };
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
