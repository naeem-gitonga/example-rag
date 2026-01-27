import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

interface LambdaConfig {
  functionName: string;
  endpoint: string;
}

const lambdaConfigs: Record<string, LambdaConfig> = {
  ingestion: {
    functionName: "ingestion",
    endpoint: process.env.INGESTION_LAMBDA_ENDPOINT || "http://localhost:8002",
  },
  query: {
    functionName: "query",
    endpoint: process.env.QUERY_LAMBDA_ENDPOINT || "http://localhost:8003",
  },
};

const clients: Record<string, LambdaClient> = {};

function getClient(service: string): LambdaClient {
  if (!clients[service]) {
    const config = lambdaConfigs[service];
    if (!config) {
      throw new Error(`Unknown Lambda service: ${service}`);
    }
    clients[service] = new LambdaClient({
      endpoint: config.endpoint,
      region: "us-east-1",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
  }
  return clients[service];
}

export async function invokeLambda(
  service: "ingestion" | "query",
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const client = getClient(service);
  const config = lambdaConfigs[service];

  const command = new InvokeCommand({
    FunctionName: config.functionName,
    Payload: JSON.stringify(payload),
  });

  const response = await client.send(command);

  if (response.Payload) {
    const responsePayload = JSON.parse(Buffer.from(response.Payload).toString());
    // Lambda returns { statusCode, body } - parse the body
    if (responsePayload.body) {
      return {
        statusCode: responsePayload.statusCode,
        data: JSON.parse(responsePayload.body),
      };
    }
    return responsePayload;
  }

  throw new Error("No response from Lambda");
}
