import { env } from "../../config/env";

interface EmbedResponse {
	embedding: number[];
	modelName: string;
}

interface OcrResponse {
	text: string;
	language?: string;
	source?: string;
}

interface EnsureModelResponse {
	downloadId: string;
	modelId: string;
	status: "pending" | "downloading" | "completed" | "failed";
	progress: number;
	message?: string;
}

interface ModelDownloadStatusResponse {
	downloadId: string;
	modelId: string;
	status: "pending" | "downloading" | "completed" | "failed";
	progress: number;
	message?: string;
}

interface ModelReadyStatusResponse {
	task: "embedding" | "ocr";
	tier: "lightweight" | "medium" | "heavy";
	modelId: string;
	ready: boolean;
}

async function postJson<T>(
	path: string,
	body: Record<string, unknown>,
): Promise<T> {
	if (!env.AI_INFERENCE_URL) {
		throw new Error("AI inference service is not configured");
	}

	const response = await fetch(`${env.AI_INFERENCE_URL}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(env.AI_INFERENCE_TOKEN
				? { Authorization: `Bearer ${env.AI_INFERENCE_TOKEN}` }
				: {}),
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Inference request failed (${response.status}): ${text}`);
	}

	return (await response.json()) as T;
}

async function postStream<T>(
	path: string,
	input: {
		stream: ReadableStream;
		fileName: string;
		mimeType: string;
		modelTier: "lightweight" | "medium" | "heavy";
	},
): Promise<T> {
	if (!env.AI_INFERENCE_URL) {
		throw new Error("AI inference service is not configured");
	}

	const response = await fetch(`${env.AI_INFERENCE_URL}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": input.mimeType || "application/octet-stream",
			"x-file-name": input.fileName,
			"x-mime-type": input.mimeType,
			"x-model-tier": input.modelTier,
			...(env.AI_INFERENCE_TOKEN
				? { Authorization: `Bearer ${env.AI_INFERENCE_TOKEN}` }
				: {}),
		},
		body: input.stream,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Inference stream request failed (${response.status}): ${text}`,
		);
	}

	return (await response.json()) as T;
}

export async function inferEmbedding(input: {
	fileId: string;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<EmbedResponse> {
	return postJson<EmbedResponse>("/embed", input);
}

export async function inferTextEmbedding(input: {
	text: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<EmbedResponse> {
	return postJson<EmbedResponse>("/embed-text", input);
}

export async function inferEmbeddingStream(input: {
	stream: ReadableStream;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<EmbedResponse> {
	return postStream<EmbedResponse>("/embed/stream", input);
}

export async function inferOcr(input: {
	fileId: string;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<OcrResponse> {
	return postJson<OcrResponse>("/ocr", input);
}

export async function inferOcrStream(input: {
	stream: ReadableStream;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<OcrResponse> {
	return postStream<OcrResponse>("/ocr/stream", input);
}

export async function ensureModel(input: {
	task: "embedding" | "ocr";
	tier: "lightweight" | "medium" | "heavy";
}): Promise<EnsureModelResponse> {
	return postJson<EnsureModelResponse>("/models/ensure", input);
}

export async function getModelDownloadStatus(
	downloadId: string,
): Promise<ModelDownloadStatusResponse> {
	if (!env.AI_INFERENCE_URL) {
		throw new Error("AI inference service is not configured");
	}

	const response = await fetch(
		`${env.AI_INFERENCE_URL}/models/download/${downloadId}`,
		{
			method: "GET",
			headers: {
				...(env.AI_INFERENCE_TOKEN
					? { Authorization: `Bearer ${env.AI_INFERENCE_TOKEN}` }
					: {}),
			},
		},
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Model download status request failed (${response.status}): ${text}`,
		);
	}

	return (await response.json()) as ModelDownloadStatusResponse;
}

export async function getModelReadyStatus(input: {
	task: "embedding" | "ocr";
	tier: "lightweight" | "medium" | "heavy";
}): Promise<ModelReadyStatusResponse> {
	if (!env.AI_INFERENCE_URL) {
		throw new Error("AI inference service is not configured");
	}

	const url = new URL(`${env.AI_INFERENCE_URL}/models/ready`);
	url.searchParams.set("task", input.task);
	url.searchParams.set("tier", input.tier);

	const response = await fetch(url.toString(), {
		method: "GET",
		headers: {
			...(env.AI_INFERENCE_TOKEN
				? { Authorization: `Bearer ${env.AI_INFERENCE_TOKEN}` }
				: {}),
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Model ready request failed (${response.status}): ${text}`);
	}

	return (await response.json()) as ModelReadyStatusResponse;
}
