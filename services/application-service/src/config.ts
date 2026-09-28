import fs from "node:fs";

export const APPLICATION_SERVICE_NAME = "Application Service";
export const SQS_QUEUE_PREFIX = "app-service-queue-";
export const CACHE_CLEANUP_INTERVAL_MS = 30_000;

function getPublicKey(): string {
  if (process.env.RSA_PUBLIC_KEY) {
    return process.env.RSA_PUBLIC_KEY.replace(/\\n/g, "\n");
  }

  const keyPath = process.env.RSA_PUBLIC_KEY_PATH || "keys/public.key";
  return fs.existsSync(keyPath) ? fs.readFileSync(keyPath, "utf8") : "";
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  region: process.env.AWS_REGION || "eu-central-1",
  snsTopicArn: process.env.SNS_TOPIC_ARN || "",
  publicKey: getPublicKey(),
};
