import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { handleLogin } from "./handlers/login.js";
import { handleInvalidate } from "./handlers/invalidate.js";

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
    if (method === "POST" && path === "/login") {
      const res = await handleLogin(event.body);
      return {
        statusCode: res.statusCode,
        headers: DEFAULT_HEADERS,
        body: res.body,
      };
    }

    if (method === "POST" && path.endsWith("/invalidate") && sessionId) {
      const res = await handleInvalidate(sessionId);
      return {
        statusCode: res.statusCode,
        headers: DEFAULT_HEADERS,
        body: res.body,
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
