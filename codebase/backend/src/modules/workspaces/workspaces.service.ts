import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@contentpilot/shared';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { TIER_LIMITS } from '../../common/constants/billing-limits';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
    private usersService: UsersService,
    private mailService: MailService,
  ) {}

  async create(name: string, ownerId: string): Promise<WorkspaceDocument> {
    const owner = await this.usersService.findById(ownerId);
    const tier = owner?.subscriptionTier || 'free';
    
    const existingCount = await this.workspaceModel.countDocuments({
      ownerId: new Types.ObjectId(ownerId),
    });
    
    const limit = TIER_LIMITS[tier]?.workspaces ?? 1;

    if (existingCount >= limit) {
      throw new BadRequestException(
        `Workspace quota limit reached. Your current plan (${tier.toUpperCase()}) allows up to ${limit} workspace(s). Please upgrade your plan to create more workspaces.`
      );
    }

    const workspace = new this.workspaceModel({
      name,
      ownerId: new Types.ObjectId(ownerId),
      members: [
        {
          userId: new Types.ObjectId(ownerId),
          role: UserRole.OWNER,
        },
      ],
    });

    return workspace.save();
  }

  async findAllForUser(userId: string): Promise<WorkspaceDocument[]> {
    return this.workspaceModel
      .find({
        $or: [
          { ownerId: new Types.ObjectId(userId) },
          { 'members.userId': new Types.ObjectId(userId) },
        ],
      })
      .exec();
  }

  async findById(id: string): Promise<WorkspaceDocument | null> {
    return this.workspaceModel.findById(id).populate('members.userId', 'name email avatarUrl').exec();
  }

  async updateName(id: string, name: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findByIdAndUpdate(
      id,
      { name },
      { new: true },
    );
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async inviteMember(workspaceId: string, email: string, role: UserRole, name?: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const owner = await this.usersService.findById(workspace.ownerId.toString());
    const tier = owner?.subscriptionTier || 'free';
    const limit = TIER_LIMITS[tier]?.members ?? 1;

    if (workspace.members.length >= limit) {
      throw new BadRequestException(
        `Team member limit reached. Your current plan (${tier.toUpperCase()}) allows up to ${limit} active member(s). Please upgrade your plan to invite more team members.`
      );
    }

    let tempPassword: string | undefined;
    let invitedUser = await this.usersService.findByEmail(email);
    if (!invitedUser) {
      const displayName = name || email.split('@')[0];
      tempPassword = 'WelcomeCP' + Math.random().toString(36).substring(2, 7) + '!';
      invitedUser = await this.usersService.create(email, tempPassword, displayName);
    }

    const userIdString = invitedUser._id.toString();
    
    // Check if already a member
    const alreadyMember = workspace.members.some(
      (m) => m.userId.toString() === userIdString,
    );
    if (alreadyMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    workspace.members.push({
      userId: invitedUser._id,
      role,
    });

    const saved = await workspace.save();
    await this.mailService.sendWorkspaceInviteEmail(invitedUser.email, workspace.name, role, owner?.name, tempPassword);
    
    if (tempPassword) {
      (saved as any)._doc = {
        ...saved.toObject(),
        tempPassword,
      };
    }
    
    return saved;
  }

  async removeMember(workspaceId: string, userIdToRemove: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Owner cannot be removed
    if (workspace.ownerId.toString() === userIdToRemove) {
      throw new ConflictException('Workspace owner cannot be removed');
    }

    const memberIndex = workspace.members.findIndex(
      (m) => m.userId.toString() === userIdToRemove,
    );
    if (memberIndex === -1) {
      throw new NotFoundException('Member not found in this workspace');
    }

    workspace.members.splice(memberIndex, 1);
    return workspace.save();
  }
}
