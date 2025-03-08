import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@xilehq/internal/prisma.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.headers['x-workspace-id'];

    if (!workspaceId) {
      throw new UnauthorizedException('Workspace ID is required');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new UnauthorizedException('Workspace not found');
    }

    // Add the workspace to the request object
    request.workspace = workspace;

    return true;
  }
}
