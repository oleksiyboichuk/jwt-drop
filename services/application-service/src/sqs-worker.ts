import { v4 as uuidv4 } from "uuid";
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
} from "@aws-sdk/client-sqs";
import { SNSClient, SubscribeCommand, UnsubscribeCommand } from "@aws-sdk/client-sns";
import { SessionInvalidationEvent } from "./types.js";
import { config, SQS_QUEUE_PREFIX } from "./config.js";
import { addInvalidatedSession } from "./cache.js";

export class SqsWorker {
  private sqsClient: SQSClient;
  private snsClient: SNSClient;
  private queueUrl?: string;
  private queueArn?: string;
  private subscriptionArn?: string;
  private isRunning = false;

  constructor() {
    this.sqsClient = new SQSClient({ region: config.region });
    this.snsClient = new SNSClient({ region: config.region });
  }

  async start(): Promise<void> {
    if (!config.snsTopicArn) {
      console.warn("[worker] SNS_TOPIC_ARN not configured, skipping worker");
      return;
    }

    try {
      const uniqueSuffix = uuidv4().slice(0, 8);
      const queueName = `${SQS_QUEUE_PREFIX}${uniqueSuffix}`;

      const createRes = await this.sqsClient.send(
        new CreateQueueCommand({
          QueueName: queueName,
          Attributes: {
            MessageRetentionPeriod: "3600",
          },
        })
      );
      this.queueUrl = createRes.QueueUrl;

      const attrRes = await this.sqsClient.send(
        new GetQueueAttributesCommand({
          QueueUrl: this.queueUrl,
          AttributeNames: ["QueueArn"],
        })
      );
      this.queueArn = attrRes.Attributes?.QueueArn;

      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "sns.amazonaws.com" },
            Action: "sqs:SendMessage",
            Resource: this.queueArn,
            Condition: {
              ArnEquals: { "aws:SourceArn": config.snsTopicArn },
            },
          },
        ],
      };

      await this.sqsClient.send(
        new SetQueueAttributesCommand({
          QueueUrl: this.queueUrl,
          Attributes: {
            Policy: JSON.stringify(policy),
          },
        })
      );

      const subRes = await this.snsClient.send(
        new SubscribeCommand({
          TopicArn: config.snsTopicArn,
          Protocol: "sqs",
          Endpoint: this.queueArn,
          Attributes: {
            RawMessageDelivery: "false",
          },
        })
      );
      this.subscriptionArn = subRes.SubscriptionArn;

      this.isRunning = true;
      this.pollMessages();
      console.log(`[worker] Subscribed to SNS topic via queue: ${queueName}`);
    } catch (error) {
      console.error("[worker] Failed to start:", error);
    }
  }

  private async pollMessages(): Promise<void> {
    while (this.isRunning && this.queueUrl) {
      try {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
          })
        );

        const messages = response.Messages || [];
        for (const message of messages) {
          if (!message.Body) continue;

          try {
            const envelope = JSON.parse(message.Body);
            const eventPayload: SessionInvalidationEvent =
              typeof envelope.Message === "string"
                ? JSON.parse(envelope.Message)
                : envelope;

            if (eventPayload.sessionId && eventPayload.expiration) {
              addInvalidatedSession(eventPayload.sessionId, eventPayload.expiration);
              console.log(`[worker] Session invalidated: ${eventPayload.sessionId}`);
            }

            await this.sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              })
            );
          } catch (parseError) {
            console.error("[worker] Failed to parse message:", parseError);
          }
        }
      } catch (error) {
        if (!this.isRunning) break;
        console.error("[worker] Error polling messages, retrying in 3s:", error);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.subscriptionArn && this.subscriptionArn !== "pending confirmation") {
      try {
        await this.snsClient.send(
          new UnsubscribeCommand({ SubscriptionArn: this.subscriptionArn })
        );
      } catch (err) {
        console.warn("[worker] Failed to unsubscribe from SNS:", err);
      }
    }

    if (this.queueUrl) {
      try {
        await this.sqsClient.send(
          new DeleteQueueCommand({ QueueUrl: this.queueUrl })
        );
      } catch (err) {
        console.warn("[worker] Failed to delete SQS queue:", err);
      }
    }

    console.log("[worker] Stopped and cleaned up");
  }
}

export const sqsWorker = new SqsWorker();
