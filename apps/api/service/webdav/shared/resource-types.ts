import type { Node, StorageProvider } from "@drivebase/db";
import type { WebDavResolvedProviderScope } from "./types";

export type WebDavResource =
	| {
			kind: "root";
			requestPath: string;
			hrefPath: string;
	  }
	| {
			kind: "directory";
			requestPath: string;
			hrefPath: string;
			scope: WebDavResolvedProviderScope | null;
			provider: Pick<StorageProvider, "id" | "name" | "workspaceId">;
			node: Node;
	  }
	| {
			kind: "file";
			requestPath: string;
			hrefPath: string;
			scope: WebDavResolvedProviderScope | null;
			provider: Pick<StorageProvider, "id" | "name" | "workspaceId">;
			node: Node;
	  };
