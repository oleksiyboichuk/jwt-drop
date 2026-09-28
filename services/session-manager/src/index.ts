import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { handleLogin } from "./handlers/login.js";
import { handleInvalidate } from "./handlers/invalidate.js";
import { HandlerResponse } from "./types.js";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || "GET";
  const path = event.rawPath || "/";
  const sessionId = event.pathParameters?.sessionId;

  try {
    let response: HandlerResponse | undefined;

    if (method === "POST" && path === "/login") {
      response = await handleLogin(event.body);
    } else if (method === "POST" && sessionId) {
      response = await handleInvalidate(sessionId);
    }

    if (response) {
      return {
        statusCode: response.statusCode,
        headers: DEFAULT_HEADERS,
        body: response.body,
      };
    }

    return {
      statusCode: 404,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        error: "Not Found",
        message: `Route ${method} ${path} not found`,
      }),
    };
  } catch (error) {
    console.error("Internal Server Error:", error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}
