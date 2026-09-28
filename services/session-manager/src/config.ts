import fs from "node:fs";
import path from "node:path";
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

  const localKeyPath = path.resolve(process.cwd(), "keys/private.key");
  const parentKeyPath = path.resolve(process.cwd(), "../../keys/private.key");

  if (fs.existsSync(localKeyPath)) {
    return fs.readFileSync(localKeyPath, "utf8");
  }
  if (fs.existsSync(parentKeyPath)) {
    return fs.readFileSync(parentKeyPath, "utf8");
  }

  return "";
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
