import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@contentpilot/shared';
import { Workspace, WorkspaceDocument } from './schemas/workspace.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
    private usersService: UsersService,
  ) {}

  async create(name: string, ownerId: string): Promise<WorkspaceDocument> {
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

  async inviteMember(workspaceId: string, email: string, role: UserRole): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const invitedUser = await this.usersService.findByEmail(email);
    if (!invitedUser) {
      throw new NotFoundException('User with this email not found. Please ask them to sign up first.');
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

    return workspace.save();
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
