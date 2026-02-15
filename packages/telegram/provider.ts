import type {
	CopyOptions,
	CreateFolderOptions,
	DeleteOptions,
	DownloadOptions,
	DownloadResponse,
	FileMetadata,
	FolderMetadata,
	IStorageProvider,
	ListOptions,
	ListResult,
	MoveOptions,
	ProviderConfig,
	ProviderQuota,
	UploadOptions,
	UploadResponse,
} from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import { Api, TelegramClient } from "telegram";
import { CustomFile } from "telegram/client/uploads";
import { StringSession } from "telegram/sessions";
import type { TelegramConfig } from "./schema";
import { TelegramConfigSchema } from "./schema";

/**
 * Telegram storage provider.
 *
 * Uses Telegram's "Saved Messages" as cloud storage.
 * Files are sent as messages to self; remoteId = message ID.
 * Telegram has no real folder concept — folders are virtual.
 */
export class TelegramProvider implements IStorageProvider {
	private client: TelegramClient | null = null;
	private config: TelegramConfig | null = null;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = TelegramConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("telegram", "Invalid Telegram configuration", {
				errors: parsed.error.errors,
			});
		}

		this.config = parsed.data;

		// If no session string yet, provider is pending auth — skip client setup
		if (!this.config.sessionString) {
			return;
		}

		const session = new StringSession(this.config.sessionString);
		this.client = new TelegramClient(
			session,
			this.config.apiId,
			this.config.apiHash,
			{ connectionRetries: 3 },
		);

		// Connect with a timeout to prevent hanging indefinitely
		// The underlying library sometimes has unhandled TIMEOUT errors in its update loop
		// so we try to catch initial connection issues here.
		try {
			await Promise.race([
				this.client.connect(),
				new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error("Telegram connection timeout")),
						15000,
					),
				),
			]);

			// Fetch dialogs to populate entity cache (needed to resolve channel IDs)
			// We limit to 50 to avoid long startup, but enough to find the storage channel if active
			await this.client.getDialogs({ limit: 50 });
		} catch (e) {
			console.warn("Telegram initialization warning:", e);
			// We don't throw here to avoid crashing the whole provider initialization
			// If actual operations (upload/download) fail, they will throw then.
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.client) {
			return false;
		}

		try {
			await this.client.getMe();
			return true;
		} catch (error) {
			console.error("Telegram connection test failed:", error);
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		// Telegram doesn't expose storage quota to users.
		// Premium users get unlimited storage; free users have a 2GB per-file limit.
		return {
			total: undefined,
			used: 0,
			available: undefined,
		};
	}

	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const client = this.ensureInitialized();

		try {
			const me = await client.getMe();
			const user = me as Api.User;
			const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

			return {
				name: name || undefined,
				// Telegram users don't have email — use phone or username
				email: user.username ? `@${user.username}` : (user.phone ?? undefined),
			};
		} catch (error) {
			throw new ProviderError("telegram", "Failed to get account info", {
				error,
			});
		}
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		// Telegram doesn't support presigned URLs.
		// We generate a temporary ID that encodes the parentId (target channel) and filename.
		// format: pending_<parentId>_<fileNameBase64>_<timestamp>_<random>
		const parentId = options.parentId || "me";
		const fileNameBase64 = Buffer.from(options.name).toString("base64");
		const tempId = `pending_${parentId}_${fileNameBase64}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

		return {
			fileId: tempId,
			uploadUrl: undefined,
			uploadFields: undefined,
			useDirectUpload: false,
		};
	}

	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<void> {
		const client = this.ensureInitialized();

		try {
			let buffer: Buffer;
			if (Buffer.isBuffer(data)) {
				buffer = data;
			} else {
				const chunks: Uint8Array[] = [];
				const reader = data.getReader();
				let done = false;
				while (!done) {
					const result = await reader.read();
					done = result.done;
					if (result.value) {
						chunks.push(result.value);
					}
				}
				buffer = Buffer.concat(chunks);
			}

			// Determine target entity and filename
			let entity: string | number | bigint = "me";
			let fileName = "file";

			if (remoteId.startsWith("pending_")) {
				const parts = remoteId.split("_");
				if (parts.length >= 3) {
					const pid = parts[1];
					const nameB64 = parts[2];

					if (pid && pid !== "me") {
						try {
							entity = BigInt(pid);
						} catch {
							// fallback to me
						}
					}

					if (nameB64) {
						try {
							fileName = Buffer.from(nameB64, "base64").toString("utf8");
						} catch {
							// fallback to default
						}
					}
				}
			}

			// Send file
			const file = new CustomFile(fileName, buffer.length, "", buffer);
			// gramjs uses BigInteger from 'bigjs' internally, but our ID is BigInt.
			// Casting to any to allow library to handle conversion.
			// biome-ignore lint/suspicious/noExplicitAny: gramjs expects BigInteger but handles other types at runtime
			await client.sendFile(entity as any, {
				file,
				forceDocument: true,
			});
		} catch (error) {
			throw new ProviderError("telegram", "Failed to upload file", {
				error,
			});
		}
	}

	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		// Telegram doesn't support direct download URLs — always proxy
		return {
			fileId: options.remoteId,
			downloadUrl: undefined,
			useDirectDownload: false,
		};
	}

	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const client = this.ensureInitialized();

		try {
			const messageId = parseInt(remoteId, 10);
			if (Number.isNaN(messageId)) {
				throw new ProviderError("telegram", "Invalid message ID");
			}

			const messages = await client.getMessages("me", {
				ids: [messageId],
			});

			const message = messages[0];
			if (!message || !message.media) {
				throw new ProviderError(
					"telegram",
					"Message not found or has no media",
				);
			}

			const downloaded = await client.downloadMedia(message, {});
			if (!downloaded) {
				throw new ProviderError("telegram", "Failed to download media");
			}

			const buffer = Buffer.isBuffer(downloaded)
				? downloaded
				: Buffer.from(downloaded as string);

			return new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array(buffer));
					controller.close();
				},
			});
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("telegram", "Failed to download file", {
				error,
			});
		}
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const client = this.ensureInitialized();

		try {
			// Create a broadcast channel for the folder
			const result = await client.invoke(
				new Api.channels.CreateChannel({
					title: options.name,
					about: "Drivebase storage channel",
					broadcast: true,
					megagroup: false,
				}),
			);

			const chats = (result as unknown as { chats: Api.Chat[] }).chats;
			if (chats && chats.length > 0) {
				const chat = chats[0];
				if (chat?.id) {
					return String(chat.id);
				}
			}
			throw new Error("No chat returned after channel creation");
		} catch (error) {
			// If generic error, throw
			throw new ProviderError("telegram", "Failed to create channel", {
				error,
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const client = this.ensureInitialized();

		try {
			const messageId = parseInt(options.remoteId, 10);
			if (Number.isNaN(messageId)) {
				throw new ProviderError("telegram", "Invalid message ID");
			}

			await client.deleteMessages("me", [messageId], {
				revoke: true,
			});
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("telegram", "Failed to delete file", {
				error,
			});
		}
	}

	async move(_options: MoveOptions): Promise<void> {
		// Telegram doesn't support moving messages between chats natively.
		throw new ProviderError(
			"telegram",
			"Move is not supported by Telegram provider",
		);
	}

	async copy(_options: CopyOptions): Promise<string> {
		const client = this.ensureInitialized();

		try {
			const messageId = parseInt(_options.remoteId, 10);
			if (Number.isNaN(messageId)) {
				throw new ProviderError("telegram", "Invalid message ID");
			}

			// Forward message to self (copy)
			const result = await client.forwardMessages("me", {
				messages: [messageId],
				fromPeer: "me",
			});

			const forwarded = result[0];
			if (!forwarded) {
				throw new ProviderError("telegram", "Failed to forward message");
			}

			return String(forwarded.id);
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("telegram", "Failed to copy file", {
				error,
			});
		}
	}

	async list(options: ListOptions): Promise<ListResult> {
		const client = this.ensureInitialized();

		try {
			const limit = options.limit ?? 100;
			const offsetId = options.pageToken ? parseInt(options.pageToken, 10) : 0;

			// Get messages from Saved Messages that contain media/documents
			const messages = await client.getMessages("me", {
				limit,
				offsetId,
			});

			const fileList: FileMetadata[] = [];
			let lastMessageId: number | undefined;

			for (const msg of messages) {
				if (!msg.media) continue;

				const doc =
					msg.media instanceof Api.MessageMediaDocument
						? msg.media.document
						: null;

				if (doc && doc instanceof Api.Document) {
					// Extract filename from attributes
					let fileName = `file_${msg.id}`;
					const mimeType = doc.mimeType || "application/octet-stream";

					for (const attr of doc.attributes) {
						if (attr instanceof Api.DocumentAttributeFilename) {
							fileName = attr.fileName;
						}
					}

					fileList.push({
						remoteId: String(msg.id),
						name: fileName,
						mimeType,
						size: Number(doc.size),
						modifiedAt: new Date(msg.date * 1000),
					});
				} else if (msg.media instanceof Api.MessageMediaPhoto) {
					fileList.push({
						remoteId: String(msg.id),
						name: `photo_${msg.id}.jpg`,
						mimeType: "image/jpeg",
						size: 0, // Photo size not easily accessible
						modifiedAt: new Date(msg.date * 1000),
					});
				}

				lastMessageId = msg.id;
			}

			return {
				files: fileList,
				folders: [], // Telegram has no folder concept
				nextPageToken:
					messages.length >= limit && lastMessageId
						? String(lastMessageId)
						: undefined,
			};
		} catch (error) {
			throw new ProviderError("telegram", "Failed to list files", {
				error,
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const client = this.ensureInitialized();

		try {
			const messageId = parseInt(remoteId, 10);
			if (Number.isNaN(messageId)) {
				throw new ProviderError("telegram", "Invalid message ID");
			}

			const messages = await client.getMessages("me", {
				ids: [messageId],
			});

			const msg = messages[0];
			if (!msg || !msg.media) {
				throw new ProviderError(
					"telegram",
					"Message not found or has no media",
				);
			}

			const doc =
				msg.media instanceof Api.MessageMediaDocument
					? msg.media.document
					: null;

			if (doc && doc instanceof Api.Document) {
				let fileName = `file_${msg.id}`;

				for (const attr of doc.attributes) {
					if (attr instanceof Api.DocumentAttributeFilename) {
						fileName = attr.fileName;
					}
				}

				return {
					remoteId: String(msg.id),
					name: fileName,
					mimeType: doc.mimeType || "application/octet-stream",
					size: Number(doc.size),
					modifiedAt: new Date(msg.date * 1000),
				};
			}

			if (msg.media instanceof Api.MessageMediaPhoto) {
				return {
					remoteId: String(msg.id),
					name: `photo_${msg.id}.jpg`,
					mimeType: "image/jpeg",
					size: 0,
					modifiedAt: new Date(msg.date * 1000),
				};
			}

			throw new ProviderError("telegram", "Unsupported media type");
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("telegram", "Failed to get file metadata", {
				error,
			});
		}
	}

	async getFolderMetadata(_remoteId: string): Promise<FolderMetadata> {
		// Telegram has no real folders
		throw new ProviderError(
			"telegram",
			"Folders are not supported by Telegram provider",
		);
	}

	async cleanup(): Promise<void> {
		if (this.client) {
			await this.client.disconnect();
		}
		this.client = null;
		this.config = null;
	}

	private ensureInitialized(): TelegramClient {
		if (!this.client) {
			throw new ProviderError("telegram", "Provider not initialized");
		}
		return this.client;
	}
}
