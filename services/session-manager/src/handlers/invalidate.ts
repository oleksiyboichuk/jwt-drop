import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PublishCommand } from "@aws-sdk/client-sns";
import { SessionRecord, SessionInvalidationEvent, HandlerResponse } from "../types.js";
import { config, docClient, snsClient } from "../config.js";

export async function handleInvalidate(sessionId: string): Promise<HandlerResponse> {
  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad Request", message: "Missing sessionId parameter" }),
    };
  }

  let updatedRecord: SessionRecord;
  try {
    const updateResult = await docClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { sessionId },
        UpdateExpression: "SET isSessionInvalidated = :invalidated",
        ConditionExpression: "attribute_exists(sessionId)",
        ExpressionAttributeValues: {
          ":invalidated": true,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    updatedRecord = updateResult.Attributes as SessionRecord;
  } catch (err) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not Found", message: "Session not found" }),
      };
    }
    throw err;
  }

  const eventPayload: SessionInvalidationEvent = {
    sessionId: updatedRecord.sessionId,
    expiration: updatedRecord.expiration,
  };

  if (config.snsTopicArn) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: config.snsTopicArn,
        Message: JSON.stringify(eventPayload),
        Subject: "SessionInvalidated",
      })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Session successfully invalidated",
      sessionId: updatedRecord.sessionId,
      expiration: updatedRecord.expiration,
    }),
  };
}
