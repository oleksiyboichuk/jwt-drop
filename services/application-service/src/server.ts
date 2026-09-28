import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload, WhoAmIResponse, ErrorResponse } from "./types.js";
import { config, APPLICATION_SERVICE_NAME } from "./config.js";
import {
  isSessionInvalidated,
  startPeriodicPruning,
} from "./cache.js";
import { sqsWorker } from "./sqs-worker.js";

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/whoami", (req: Request, res: Response<WhoAmIResponse | ErrorResponse>): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing or malformed Authorization header. Expected 'Bearer <jwt>'",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, config.publicKey, {
        algorithms: ["RS256"],
      }) as JWTPayload;

      if (isSessionInvalidated(decoded.sessionId)) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Session has been invalidated",
        });
        return;
      }

      res.status(200).json({
        serviceName: APPLICATION_SERVICE_NAME,
        sessionId: decoded.sessionId,
        jwtExp: decoded.exp,
      });
    } catch (err) {
      const message =
        err instanceof Error && err.name === "TokenExpiredError"
          ? "Token has expired"
          : "Invalid token";

      res.status(401).json({
        error: "Unauthorized",
        message,
      });
    }
  }
);

app.use((_req: Request, res: Response<ErrorResponse>) => {
  res.status(404).json({
    error: "Not Found",
    message: "Route not found",
  });
});

async function bootstrap() {
  startPeriodicPruning();
  await sqsWorker.start();

  const server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });

  async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await sqsWorker.stop();
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

bootstrap().catch((error) => {
  console.error("Bootstrap error:", error);
  process.exit(1);
});
