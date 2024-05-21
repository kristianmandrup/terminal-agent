import { Duplex } from "node:stream";

import { AnsiUp } from "ansi_up";

export class ExecStreamHandler {
  ansiUp = new AnsiUp();

  async handle(execStream: Duplex, useHtmlOutput = true): Promise<string> {
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
        const output = useHtmlOutput ? this.ansiUp.ansi_to_html(data) : data;
        // Resolve the Promise with the data
        resolve(output);
      });

      // Listen for errors on the stream
      execStream.on("error", (error: Error) => {
        // Reject the Promise with the error
        reject(error);
      });
    });
  }
}
