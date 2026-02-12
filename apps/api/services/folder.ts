import type { Database } from "@drivebase/db";
import { folders, storageProviders } from "@drivebase/db";
import { eq, and, or, isNull } from "drizzle-orm";
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
  normalizePath,
  joinPath,
  getParentPath,
  getBasename,
} from "@drivebase/core";
import { ProviderService } from "./provider";

export class FolderService {
  constructor(private db: Database) {}

  /**
   * Create a new folder
   */
  async createFolder(
    userId: string,
    name: string,
    parentId?: string,
    providerId?: string
  ) {
    // Validate name
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Folder name is required");
    }

    // Sanitize name
    const sanitizedName = name.trim().replace(/[/\\]/g, "_");

    // Determine parent folder and path
    let parentFolder = null;
    let virtualPath: string;

    if (parentId) {
      // Get parent folder
      [parentFolder] = await this.db
        .select()
        .from(folders)
        .where(and(eq(folders.id, parentId), eq(folders.isDeleted, false)))
        .limit(1);

      if (!parentFolder) {
        throw new NotFoundError("Parent folder");
      }

      // Check if user has access to parent
      // TODO: Implement permission check

      virtualPath = joinPath(parentFolder.virtualPath, sanitizedName);
    } else {
      // Root level folder
      virtualPath = joinPath("/", sanitizedName);
    }

    // Check if folder already exists at this path
    const [existing] = await this.db
      .select()
      .from(folders)
      .where(
        and(eq(folders.virtualPath, virtualPath), eq(folders.isDeleted, false))
      )
      .limit(1);

    if (existing) {
      throw new ConflictError(`Folder already exists at path: ${virtualPath}`);
    }

    // If providerId specified, create folder in provider
    let remoteId: string | undefined;

    if (providerId) {
      const providerService = new ProviderService(this.db);
      const providerRecord = await providerService.getProvider(providerId, userId);
      const provider = await providerService.getProviderInstance(providerRecord);

      // Resolve parent: explicit parent folder → its remoteId,
      // root-level folder → provider's root folder (Drivebase folder)
      const parentId = parentFolder?.remoteId ?? providerRecord.rootFolderId ?? undefined;

      remoteId = await provider.createFolder({
        name: sanitizedName,
        parentId,
      });

      await provider.cleanup();
    }

    // Create folder in database
    const [folder] = await this.db
      .insert(folders)
      .values({
        virtualPath,
        name: sanitizedName,
        remoteId: remoteId ?? null,
        providerId: providerId ?? null,
        parentId: parentId ?? null,
        createdBy: userId,
        isDeleted: false,
      })
      .returning();

    if (!folder) {
      throw new Error("Failed to create folder");
    }

    return folder;
  }

  /**
   * Get folder by ID
   */
  async getFolder(folderId: string, userId: string) {
    const [folder] = await this.db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.isDeleted, false)))
      .limit(1);

    if (!folder) {
      throw new NotFoundError("Folder");
    }

    // TODO: Check permissions

    return folder;
  }

  /**
   * List folders in a path or parent
   */
  async listFolders(userId: string, path?: string, parentId?: string) {
    if (parentId) {
      // List by parent ID
      return this.db
        .select()
        .from(folders)
        .where(and(eq(folders.parentId, parentId), eq(folders.isDeleted, false)))
        .orderBy(folders.name);
    } else if (path) {
      // List by path (children of path)
      const normalizedPath = normalizePath(path);
      return this.db
        .select()
        .from(folders)
        .where(
          and(eq(folders.virtualPath, normalizedPath), eq(folders.isDeleted, false))
        )
        .orderBy(folders.name);
    } else {
      // List root folders
      return this.db
        .select()
        .from(folders)
        .where(and(isNull(folders.parentId), eq(folders.isDeleted, false)))
        .orderBy(folders.name);
    }
  }

  /**
   * Rename a folder
   */
  async renameFolder(folderId: string, userId: string, newName: string) {
    // Get folder
    const folder = await this.getFolder(folderId, userId);

    // Sanitize new name
    const sanitizedName = newName.trim().replace(/[/\\]/g, "_");

    if (!sanitizedName) {
      throw new ValidationError("Folder name is required");
    }

    // Calculate new virtual path
    const parentPath = getParentPath(folder.virtualPath);
    const newVirtualPath = joinPath(parentPath, sanitizedName);

    // Check if folder exists at new path
    const [existing] = await this.db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.virtualPath, newVirtualPath),
          eq(folders.isDeleted, false)
        )
      )
      .limit(1);

    if (existing && existing.id !== folderId) {
      throw new ConflictError(`Folder already exists at path: ${newVirtualPath}`);
    }

    // If folder has a provider, rename in provider
    if (folder.providerId && folder.remoteId) {
      const providerService = new ProviderService(this.db);
      const providerRecord = await providerService.getProvider(
        folder.providerId,
        userId
      );
      const provider = await providerService.getProviderInstance(providerRecord);

      await provider.move({
        remoteId: folder.remoteId,
        newName: sanitizedName,
      });

      await provider.cleanup();
    }

    // Update folder in database
    const [updated] = await this.db
      .update(folders)
      .set({
        name: sanitizedName,
        virtualPath: newVirtualPath,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId))
      .returning();

    if (!updated) {
      throw new Error("Failed to rename folder");
    }

    return updated;
  }

  /**
   * Move folder to a different parent
   */
  async moveFolder(
    folderId: string,
    userId: string,
    newParentId?: string
  ) {
    // Get folder
    const folder = await this.getFolder(folderId, userId);

    // Get new parent if specified
    let newParent = null;
    let newVirtualPath: string;

    if (newParentId) {
      newParent = await this.getFolder(newParentId, userId);
      newVirtualPath = joinPath(newParent.virtualPath, folder.name);
    } else {
      // Moving to root
      newVirtualPath = joinPath("/", folder.name);
    }

    // Check if folder exists at new path
    const [existing] = await this.db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.virtualPath, newVirtualPath),
          eq(folders.isDeleted, false)
        )
      )
      .limit(1);

    if (existing && existing.id !== folderId) {
      throw new ConflictError(`Folder already exists at path: ${newVirtualPath}`);
    }

    // If folder has a provider, move in provider
    if (folder.providerId && folder.remoteId) {
      const providerService = new ProviderService(this.db);
      const providerRecord = await providerService.getProvider(
        folder.providerId,
        userId
      );
      const provider = await providerService.getProviderInstance(providerRecord);

      await provider.move({
        remoteId: folder.remoteId,
        newParentId: newParent?.remoteId ?? undefined,
      });

      await provider.cleanup();
    }

    // Update folder in database
    const [updated] = await this.db
      .update(folders)
      .set({
        parentId: newParentId ?? null,
        virtualPath: newVirtualPath,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId))
      .returning();

    if (!updated) {
      throw new Error("Failed to move folder");
    }

    return updated;
  }

  /**
   * Delete a folder (soft delete)
   */
  async deleteFolder(folderId: string, userId: string) {
    // Get folder
    const folder = await this.getFolder(folderId, userId);

    // If folder has a provider, delete from provider
    if (folder.providerId && folder.remoteId) {
      const providerService = new ProviderService(this.db);
      const providerRecord = await providerService.getProvider(
        folder.providerId,
        userId
      );
      const provider = await providerService.getProviderInstance(providerRecord);

      await provider.delete({
        remoteId: folder.remoteId,
        isFolder: true,
      });

      await provider.cleanup();
    }

    // Soft delete folder in database
    await this.db
      .update(folders)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId));
  }

  /**
   * Star a folder
   */
  async starFolder(folderId: string, userId: string) {
    // Get folder to ensure it exists and user has access
    await this.getFolder(folderId, userId);

    // Star the folder
    const [updated] = await this.db
      .update(folders)
      .set({
        starred: true,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId))
      .returning();

    if (!updated) {
      throw new Error("Failed to star folder");
    }

    return updated;
  }

  /**
   * Unstar a folder
   */
  async unstarFolder(folderId: string, userId: string) {
    // Get folder to ensure it exists and user has access
    await this.getFolder(folderId, userId);

    // Unstar the folder
    const [updated] = await this.db
      .update(folders)
      .set({
        starred: false,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, folderId))
      .returning();

    if (!updated) {
      throw new Error("Failed to unstar folder");
    }

    return updated;
  }

  /**
   * Get starred folders
   */
  async getStarredFolders(userId: string) {
    return this.db
      .select()
      .from(folders)
      .where(and(eq(folders.starred, true), eq(folders.isDeleted, false)))
      .orderBy(folders.name);
  }
}
