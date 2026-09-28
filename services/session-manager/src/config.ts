import fs from "node:fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SNSClient } from "@aws-sdk/client-sns";

export const TOKEN_EXPIRATION_SECONDS = 180;

export const HARDCODED_USER = {
  username: "admin",
  password: "password123",
} as const;

function getPrivateKey(): string {
  if (process.env.RSA_PRIVATE_KEY) {
    return process.env.RSA_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  const keyPath = process.env.RSA_PRIVATE_KEY_PATH || "keys/private.key";
  return fs.existsSync(keyPath) ? fs.readFileSync(keyPath, "utf8") : "";
}

export const config = {
  region: process.env.AWS_REGION || "eu-central-1",
  tableName: process.env.DYNAMODB_TABLE_NAME || "Sessions",
  snsTopicArn: process.env.SNS_TOPIC_ARN || "",
  privateKey: getPrivateKey(),
};

const ddbClient = new DynamoDBClient({ region: config.region });
export const docClient = DynamoDBDocumentClient.from(ddbClient);
export const snsClient = new SNSClient({ region: config.region });
