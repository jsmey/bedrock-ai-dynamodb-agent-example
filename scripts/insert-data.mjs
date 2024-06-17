import { BatchWriteItemCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from 'fs';

const dynamoDB = new DynamoDBClient({ region: 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(dynamoDB);

async function DumpIntoTable(tableName, fileName){

    let rawFile = readFileSync(`./scripts/${fileName}` , 'utf-8')

    let jsonData = JSON.parse(rawFile);
    let chunkSize = 20;
    let chunks = jsonData.length / chunkSize;

    for (let i = 0; i < chunks; i++) {
        let chunk = jsonData.slice(i * chunkSize, (i + 1) * chunkSize);
        let params = {
            RequestItems: {
                [tableName]: chunk.map(item => ({ PutRequest: { Item: item } }))
            }
        };
        console.log(`Writing ${chunk.length} items to table ${tableName}`)
        await docClient.send(new BatchWriteItemCommand(params));
    }
}

// Write some sample data to the tables we created
DumpIntoTable('jeeps', 'jeeps.json');

