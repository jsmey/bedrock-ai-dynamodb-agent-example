# AWS Bedrock with DynamoDB agent

AWS Bedrock AI Stack implementing the RAG architectural pattern against a private DynamoDB table.

## Useful commands

* `npm run build`   compile typescript to js
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npm deploy:sampleData` populates the DynamoDB table with sample data


## Deploying the stack

install dependencies `npm i`

Deploy the AWS stack `npx cdk deploy`

Populate DynamoDB with sample data `npm run deploy:sampleData`

# in the AWS console:
- publish the api
- add usage plan to the published stage
- get the api key
- prepare the bedrock agent

# testing
``` curl [API_GATEWAY_URL] \
  -X POST \
  -d "{ \"prompt\": \"List all Wranglers\"}" \
  -H "x-api-key: [API_KEY]" \
  -H "Content-Type: application/json" 
```