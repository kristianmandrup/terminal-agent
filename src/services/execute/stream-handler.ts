import { Duplex } from "node:stream";

export async function handleExecStream(execStream: Duplex): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    // Listen for 'data' events on the stream and push each chunk into the 'chunks' array
    execStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Listen for the 'end' event, indicating that the stream has finished
    execStream.on("end", () => {
      // Concatenate all the chunks into a single buffer
      const buffer = Buffer.concat(chunks);
      // Convert the buffer to a string
      const data = buffer.toString("utf8");
      // Resolve the Promise with the data
      resolve(data);
    });

    // Listen for errors on the stream
    execStream.on("error", (error: Error) => {
      // Reject the Promise with the error
      reject(error);
    });
  });
}
