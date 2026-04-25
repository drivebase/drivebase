import Docker from "dockerode";
import pino from "pino";

export const logger = pino({ name: "updater" });

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
  const appContainerName = Bun.env.APP_CONTAINER_NAME ?? "drivebase_app";
  const appImage = Bun.env.APP_IMAGE ?? "ghcr.io/drivebase/drivebase";
  const tag = targetVersion ?? "latest";
  const fullImage = `${appImage}:${tag}`;

  logger.info({ image: fullImage, container: appContainerName }, "Starting update");

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

    const currentVersion = info.Config.Image?.split(":")[1] ?? null;
    logger.info({ currentVersion, targetVersion: tag }, "Container inspected");
    setStatus({ currentVersion });

    const env = info.Config.Env ?? [];
    const exposedPorts = info.Config.ExposedPorts ?? {};
    const volumes = info.HostConfig.Binds ?? [];
    const portBindings = info.HostConfig.PortBindings ?? {};
    const networkMode = info.HostConfig.NetworkMode ?? "bridge";
    const restartPolicy = info.HostConfig.RestartPolicy ?? { Name: "unless-stopped" };
    const labels = info.Config.Labels ?? {};
    const networks = info.NetworkSettings.Networks ?? {};

    // 2. Pull the new image
    logger.info({ image: fullImage }, "Pulling image");
    await new Promise<void>((resolve, reject) => {
      docker.pull(fullImage, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (followErr: Error | null) => {
          if (followErr) return reject(followErr);
          logger.info({ image: fullImage }, "Image pulled successfully");
          resolve();
        });
      });
    });

    // 3. Stop and remove old container
    logger.info({ container: appContainerName }, "Stopping old container");
    setStatus({ status: "restarting", message: "Stopping old container..." });

    await container.stop().catch((err: unknown) => {
      logger.warn({ err }, "Stop failed (container may already be stopped)");
    });
    await container.remove();

    // 4. Create new container with same config
    setStatus({ message: "Starting new container..." });

    const newContainer = await docker.createContainer({
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
    });

    // 5. Re-attach to additional networks
    for (const [networkName, networkConfig] of Object.entries(networks)) {
      if (networkName === networkMode) continue;
      try {
        const network = docker.getNetwork(networkName);
        await network.connect({ Container: newContainer.id, EndpointConfig: networkConfig });
      } catch (err) {
        logger.warn({ err, network: networkName }, "Network connect failed");
      }
    }

    await newContainer.start();
    logger.info({ image: fullImage }, "New container started");

    setStatus({
      status: "done",
      message: `Successfully updated to ${fullImage}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error }, `Update failed: ${message}`);
    setStatus({ status: "error", message });
    throw error;
  }
}
