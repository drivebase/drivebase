import {
	EXTRACTION_QUEUE_NAME,
	EXTRACTION_QUEUE_OPTIONS,
} from "@/queue/extraction/queue";
import { createExtractionWorker } from "@/queue/extraction/worker";
import {
	FILE_LIFECYCLE_QUEUE_NAME,
	FILE_LIFECYCLE_QUEUE_OPTIONS,
} from "@/queue/file-lifecycle/queue";
import { createFileLifecycleWorker } from "@/queue/file-lifecycle/worker";
import { SYNC_QUEUE_NAME, SYNC_QUEUE_OPTIONS } from "@/queue/sync/queue";
import { createSyncWorker } from "@/queue/sync/worker";
import {
	TRANSFER_QUEUE_NAME,
	TRANSFER_QUEUE_OPTIONS,
} from "@/queue/transfer/queue";
import { createTransferWorker } from "@/queue/transfer/worker";
import { UPLOAD_QUEUE_NAME, UPLOAD_QUEUE_OPTIONS } from "@/queue/uploads/queue";
import { createUploadWorker } from "@/queue/uploads/worker";
import { registry } from "@/queue/registry";

registry.register({
	name: UPLOAD_QUEUE_NAME,
	defaultJobOptions: UPLOAD_QUEUE_OPTIONS,
	factory: createUploadWorker,
});

registry.register({
	name: SYNC_QUEUE_NAME,
	defaultJobOptions: SYNC_QUEUE_OPTIONS,
	factory: createSyncWorker,
});

registry.register({
	name: TRANSFER_QUEUE_NAME,
	defaultJobOptions: TRANSFER_QUEUE_OPTIONS,
	factory: createTransferWorker,
});

registry.register({
	name: EXTRACTION_QUEUE_NAME,
	defaultJobOptions: EXTRACTION_QUEUE_OPTIONS,
	factory: createExtractionWorker,
});

registry.register({
	name: FILE_LIFECYCLE_QUEUE_NAME,
	defaultJobOptions: FILE_LIFECYCLE_QUEUE_OPTIONS,
	factory: createFileLifecycleWorker,
});

export { registry };
