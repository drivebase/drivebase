import type { Database } from "@drivebase/db";
import type { PubSubChannels } from "../graphql/pubsub";
import { ActivityService } from "../service/activity";
import { AuthService } from "../service/auth";
import { FileService } from "../service/file";
import { FolderService } from "../service/folder";
import { UploadSessionManager } from "../service/file/upload";
import { ProviderService } from "../service/provider";
import { UserService } from "../service/user";
import { VaultService } from "../service/vault";
import { ServiceContainer } from "./container";
import { Tokens } from "./tokens";

import type { createPubSub } from "graphql-yoga";

/**
 * Create and wire up the service container.
 *
 * Services are registered as transient (new instance per resolve) because
 * they hold a `db` reference that may differ per request in tests.
 * Infrastructure (db, pubsub) is registered as a value/singleton.
 */
export function createContainer(
	db: Database,
	pubSub: ReturnType<typeof createPubSub<PubSubChannels>>,
): ServiceContainer {
	const container = new ServiceContainer();

	// Infrastructure
	container.value(Tokens.Database, db);
	container.value(Tokens.PubSub, pubSub);

	// Services — transient so each resolve gets a fresh instance with the
	// registered db. This keeps the same semantics as `new Service(context.db)`.
	container.register(Tokens.ActivityService, () => new ActivityService(db));
	container.register(Tokens.AuthService, () => new AuthService(db));
	container.register(Tokens.FileService, () => new FileService(db));
	container.register(Tokens.FolderService, () => new FolderService(db));
	container.register(Tokens.ProviderService, () => new ProviderService(db));
	container.register(
		Tokens.UploadSessionManager,
		() => new UploadSessionManager(db),
	);
	container.register(Tokens.UserService, () => new UserService(db));
	container.register(Tokens.VaultService, () => new VaultService(db));

	return container;
}
