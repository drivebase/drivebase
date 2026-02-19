import Docker from "dockerode";

export type UpdateState = "idle" | "pulling" | "restarting" | "done" | "error";

export interface UpdateStatus {
	status: UpdateState;
	message: string | null;
	currentVersion: string | null;
	targetVersion: string | null;
}

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

let currentStatus: UpdateStatus = {
	status: "idle",
	message: null,
	currentVersion: null,
	targetVersion: null,
};

export function getStatus(): UpdateStatus {
	return { ...currentStatus };
}

function setStatus(partial: Partial<UpdateStatus>) {
	currentStatus = { ...currentStatus, ...partial };
}

export async function performUpdate(targetVersion?: string): Promise<void> {
	const appContainerName = process.env.APP_CONTAINER_NAME || "drivebase_app";
	const appImage = process.env.APP_IMAGE || "ghcr.io/drivebase/drivebase";
	const tag = targetVersion || "latest";
	const fullImage = `${appImage}:${tag}`;

	setStatus({
		status: "pulling",
		message: `Pulling image ${fullImage}...`,
		targetVersion: tag,
		currentVersion: null,
	});

	try {
		// 1. Inspect current container to capture its config
		const container = docker.getContainer(appContainerName);
		const info = await container.inspect();

		setStatus({
			currentVersion: info.Config.Image?.split(":")[1] ?? null,
		});

		// Capture container configuration
		const env = info.Config.Env ?? [];
		const exposedPorts = info.Config.ExposedPorts ?? {};
		const volumes = info.HostConfig.Binds ?? [];
		const portBindings = info.HostConfig.PortBindings ?? {};
		const networkMode = info.HostConfig.NetworkMode ?? "bridge";
		const restartPolicy = info.HostConfig.RestartPolicy ?? {
			Name: "unless-stopped",
		};
		const labels = info.Config.Labels ?? {};

		// Get all connected networks (except the default one from NetworkMode)
		const networks = info.NetworkSettings.Networks ?? {};

		// 2. Pull the new image
		await new Promise<void>((resolve, reject) => {
			docker.pull(
				fullImage,
				(err: Error | null, stream: NodeJS.ReadableStream) => {
					if (err) return reject(err);
					docker.modem.followProgress(stream, (followErr: Error | null) => {
						if (followErr) return reject(followErr);
						resolve();
					});
				},
			);
		});

		// 3. Stop and remove old container
		setStatus({
			status: "restarting",
			message: "Stopping old container...",
		});

		await container.stop().catch(() => {
			// Container might already be stopped
		});
		await container.remove();

		// 4. Create and start new container with same config
		setStatus({ message: "Starting new container..." });

		const createOptions: Docker.ContainerCreateOptions = {
			name: appContainerName,
			Image: fullImage,
			Env: env,
			ExposedPorts: exposedPorts,
			Labels: labels,
			HostConfig: {
				Binds: volumes,
				PortBindings: portBindings,
				NetworkMode: networkMode,
				RestartPolicy: restartPolicy,
			},
		};

		const newContainer = await docker.createContainer(createOptions);

		// Connect to additional networks (beyond the default one)
		for (const [networkName, networkConfig] of Object.entries(networks)) {
			if (networkName === networkMode) continue; // skip default network
			try {
				const network = docker.getNetwork(networkName);
				await network.connect({
					Container: newContainer.id,
					EndpointConfig: networkConfig,
				});
			} catch {
				// Network may already be connected via NetworkMode
			}
		}

		await newContainer.start();

		setStatus({
			status: "done",
			message: `Successfully updated to ${fullImage}`,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown error occurred";
		setStatus({
			status: "error",
			message,
		});
		throw error;
	}
}
