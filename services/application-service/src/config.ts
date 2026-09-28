import fs from "node:fs";
import path from "node:path";

export const APPLICATION_SERVICE_NAME = "Application Service";
export const SQS_QUEUE_PREFIX = "app-service-queue-";
export const CACHE_CLEANUP_INTERVAL_MS = 30_000;

function getPublicKey(): string {
  if (process.env.RSA_PUBLIC_KEY) {
    return process.env.RSA_PUBLIC_KEY.replace(/\\n/g, "\n");
  }

  const localKeyPath = path.resolve(process.cwd(), "keys/public.key");
  const parentKeyPath = path.resolve(process.cwd(), "../../keys/public.key");

  if (fs.existsSync(localKeyPath)) {
    return fs.readFileSync(localKeyPath, "utf8");
  }
  if (fs.existsSync(parentKeyPath)) {
    return fs.readFileSync(parentKeyPath, "utf8");
  }

  return "";
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  region: process.env.AWS_REGION || "eu-central-1",
  snsTopicArn: process.env.SNS_TOPIC_ARN || "",
  publicKey: getPublicKey(),
};
