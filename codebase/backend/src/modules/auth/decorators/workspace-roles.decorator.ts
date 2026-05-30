import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@contentpilot/shared';

export const WORKSPACE_ROLES_KEY = 'workspace_roles';
export const WorkspaceRoles = (...roles: UserRole[]) => SetMetadata(WORKSPACE_ROLES_KEY, roles);
