import { env } from "../../config/env";

interface EmbedResponse {
	embedding: number[];
	modelName: string;
}

interface OcrResponse {
	text: string;
	language?: string;
}

interface DetectObjectsResponse {
	objects: Array<{
		label: string;
		confidence: number;
		bbox?: { x: number; y: number; width: number; height: number };
		count?: number;
	}>;
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

export async function inferEmbedding(input: {
	fileId: string;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<EmbedResponse> {
	return postJson<EmbedResponse>("/embed", input);
}

export async function inferOcr(input: {
	fileId: string;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<OcrResponse> {
	return postJson<OcrResponse>("/ocr", input);
}

export async function inferObjects(input: {
	fileId: string;
	fileName: string;
	mimeType: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<DetectObjectsResponse> {
	return postJson<DetectObjectsResponse>("/detect-objects", input);
}

export async function ensureModel(input: {
	task: "embedding" | "ocr" | "object_detection";
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
