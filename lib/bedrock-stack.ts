import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';

export class BedrockStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function resource
    const fn = new lambda.Function(this, 'bedrock-handler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(120),
    });
    cdk.Tags.of(fn).add('app', 'bedrock-stack');

    const role = new iam.Role(this, 'AgentLambdaFunction-execution-role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
      inlinePolicies: {
        bedrockAccessPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream'
              ],
              resources: ['*']
            })
          ]
        })
      }
    })

    fn.grantInvoke(role);

    // Create Bedrock Agent
    const dynamoAgent = new bedrock.CfnAgent(this, 'dynamoAgent', {
      agentName: 'dynamoAgent',
      foundationModel: 'meta.llama3-70b-instruct-v1:0',
      instruction: 'You are and ai agent to summarize Jeep data',
      actionGroups: [
        {
          actionGroupName: 'jeepsActionGroup',
          actionGroupExecutor: {
            lambda: fn.functionArn,
          },
          functionSchema: {
            functions: [{
              name: 'name',

              // the properties below are optional
              description: 'description',
              parameters: {}
            }
            ]
          }
        }
      ],
    });


    // add an api key
    const apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: 'JeepsApiKey'
    });

    const usagePlan = new apigateway.UsagePlan(this, 'usage-plan', {
      name: 'JeepsUsagePlan',
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      }
    });
    usagePlan.addApiKey(apiKey);
    cdk.Tags.of(usagePlan).add('app', 'bedrock-stack');

    // create a DynamoDB table
    const jeepsTable = new dynamodb.Table(this, 'jeepsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.NUMBER },
      tableName: 'jeeps'
    }); const dynamoDBPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:BatchGetItem',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [jeepsTable.tableArn],
    });

    const bedrockPolicyStatement = new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream'
      ],
      resources: ['*']
    })

    fn.addToRolePolicy(dynamoDBPolicyStatement);
    fn.addToRolePolicy(bedrockPolicyStatement);

    // Define the API Gateway resource
    const api = new apigateway.LambdaRestApi(this, 'jeeps-api', {
      handler: fn,
      proxy: false,
      cloudWatchRole: true,
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,

    });
    cdk.Tags.of(api).add('app', 'bedrock-stack');

    // Define the '/jeeps' resource with a GET method
    const jeepsResource = api.root.addResource('jeeps');
    cdk.Tags.of(jeepsResource).add('app', 'bedrock-stack');

    const integration = new apigateway.LambdaIntegration(fn)

    jeepsResource.addMethod('POST', integration, {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.header.x-api-key': true,
      },
    });

    new cdk.CfnOutput(this, 'jeeps-api-uri', { exportName: 'jeeps-api', value: api.url })
  }
}

