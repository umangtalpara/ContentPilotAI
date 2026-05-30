import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@contentpilot/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';
import { Workspace, WorkspaceDocument } from '../../workspaces/schemas/workspace.schema';

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    // Try to find workspace ID in request params, query, or body
    const workspaceId = request.params.workspaceId || request.params.id || request.body.workspaceId || request.query.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace context is required for this operation');
    }

    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new NotFoundException('Invalid workspace ID format');
    }

    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Owner of the workspace is implicitly allowed all operations
    if (workspace.ownerId.toString() === user.id) {
      return true;
    }

    // Check if the user is a member with a matching role
    const member = workspace.members.find(
      (m) => m.userId.toString() === user.id,
    );

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions within this workspace');
    }

    return true;
  }
}
