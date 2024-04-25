import { randomBytes } from "node:crypto";

// Function to generate a unique session ID
export const generateSessionId = (): string => {
  // Generate a random byte array of the desired length (e.g., 16 bytes)
  const sessionIdBytes: Buffer = randomBytes(16);

  // Convert the byte array to a hexadecimal string
  const sessionId: string = sessionIdBytes.toString("hex");

  return sessionId;
};
