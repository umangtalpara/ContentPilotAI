import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(email: string, passwordPlain: string, name: string): Promise<UserDocument> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    const user = new this.userModel({
      email,
      passwordHash,
      name,
      isVerified: false,
    });

    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async update(id: string, updateData: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async setResetPasswordToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          resetPasswordToken: tokenHash,
          resetPasswordExpires: expiresAt,
        },
      },
    ).exec();
  }

  async clearResetPasswordToken(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpires: '',
        },
      },
    ).exec();
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();
  }

  async updatePassword(userId: string, passwordPlain: string): Promise<void> {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { passwordHash } },
    ).exec();
  }

  async decrementCredits(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // We import BadRequestException if it is not imported
    if (user.aiCreditsRemaining <= 0) {
      throw new BadRequestException('Insufficient AI credits. Please upgrade your plan.');
    }
    
    user.aiCreditsRemaining -= 1;
    return user.save();
  }
}
