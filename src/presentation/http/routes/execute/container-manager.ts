import Dockerode from "dockerode";
import { config } from "dotenv";
import { pack } from "tar-fs";

// Load environment variables from .env file
config();

export interface BuildArguments {
  [key: string]: string;
}

export interface ContainerConfig {
  imageName: string;
  buildArgs: BuildArguments;
  dockerfileDir: string;
  socketPath?: string;
}

export class DockerContainerManager {
  private docker: Dockerode;
  private imageName: string;
  private buildArgs: BuildArguments;
  private dockerfileDir: string;
  private userContainers: Record<string, Record<string, string>> = {};

  constructor(config: ContainerConfig) {
    this.imageName = config.imageName;
    this.buildArgs = config.buildArgs;
    this.dockerfileDir = config.dockerfileDir;
    const socketPath =
      config.socketPath ||
      process.env.DOCKER_SOCKET_PATH ||
      "/var/run/docker.sock";
    this.docker = new Dockerode({ socketPath });
  }

  private async buildImage() {
    const buildArgumentsFormatted: any = {};
    for (const [key, value] of Object.entries(this.buildArgs)) {
      buildArgumentsFormatted[key] = value;
    }

    const tarStream = pack(this.dockerfileDir);

    return new Promise<void>((resolve, reject) => {
      this.docker.buildImage(
        tarStream,
        {
          t: this.imageName,
          buildargs: buildArgumentsFormatted,
        },
        (error, response) => {
          if (error) return reject(error);

          response?.pipe(process.stdout, { end: true });

          response?.on("end", () => resolve());
        }
      );
    });
  }

  private async getOrCreateContainer(userId: string, sessionId: string) {
    let userRegistry = this.userContainers[userId];
    if (!userRegistry) {
      userRegistry = {};
      this.userContainers[userId] = userRegistry;
    }

    let containerId = userRegistry[sessionId];
    if (!containerId) {
      const container = await this.docker.createContainer({
        Image: this.imageName,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: ["/bin/bash"], // or any other default command
      });
      containerId = container.id;
      this.userContainers[userId][sessionId] = containerId;
    }

    return this.docker.getContainer(containerId);
  }

  public async buildContainer(userId: string, sessionId: string) {
    await this.buildImage();
    return this.getOrCreateContainer(userId, sessionId);
  }

  public async executeCommand(
    userId: string,
    sessionId: string,
    command: string
  ) {
    const container = await this.getOrCreateContainer(userId, sessionId);
    const execOptions = {
      Cmd: ["sh", "-c", command],
      AttachStdout: true,
      AttachStderr: true,
    };
    const execObject = await container.exec(execOptions);

    // Start the execution with proper options
    const execStartOptions = {
      hijack: true,
      stdin: false,
      Tty: true,
    };
    return await execObject.start(execStartOptions);
  }
}
