import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { JWTPayload, SessionRecord, LoginRequest, LoginResponse, HandlerResponse } from "../types.js";
import { config, docClient, HARDCODED_USER, TOKEN_EXPIRATION_SECONDS } from "../config.js";

export async function handleLogin(bodyString: string | undefined): Promise<HandlerResponse> {
  let body: LoginRequest = {};

  if (bodyString) {
    try {
      body = JSON.parse(bodyString);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Bad Request", message: "Invalid JSON body" }),
      };
    }
  }

  const { username, password } = body;
  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad Request", message: "username and password are required" }),
    };
  }

  if (username !== HARDCODED_USER.username || password !== HARDCODED_USER.password) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized", message: "Invalid credentials" }),
    };
  }

  const sessionId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + TOKEN_EXPIRATION_SECONDS;

  const payload: JWTPayload = {
    username,
    sessionId,
    exp: expiration,
  };

  const token = jwt.sign(payload, config.privateKey, {
    algorithm: "RS256",
  });

  const sessionRecord: SessionRecord = {
    sessionId,
    username,
    expiration,
    isSessionInvalidated: false,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: config.tableName,
      Item: sessionRecord,
    })
  );

  const responseBody: LoginResponse = { token };
  return {
    statusCode: 200,
    body: JSON.stringify(responseBody),
  };
}
