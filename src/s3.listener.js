 const AWS = require('aws-sdk');
 const csvtojson = require('csvtojson');
 const {
     Writable,
     pipeline
 } = require('stream');

 class Handler {

     constructor({
         s3Svc,
         sqsSvc
     }) {
         this._s3Svc = s3Svc;
         this._sqsSvc = sqsSvc;
         this.queueName = process.env.SQS_QUEUE;
     }


     static getSdks() {
         const host = process.env.LOCALSTACK_HOST || "localhost";
         const s3Port = process.env.S3_PORT;
         const sqsPort = process.env.SQS_PORT;
         const isLocal = process.env.IS_LOCAL;

         const s3Endpoint = new AWS.Endpoint(`http://${host}:${s3Port}`);

         const s3Config = {
             endpoint: s3Endpoint,
             s3ForcePathStyle: true,
         };

         const sqsEndpoint = new AWS.Endpoint(`http://${host}:${sqsPort}`);

         const sqsConfig = {
             endpoint: sqsEndpoint
         };

         if (!isLocal) {
             delete sqsConfig.endpoint;
             delete s3Config.endpoint;
         }

         return {
             s3: new AWS.S3(s3Config),
             sqs: new AWS.SQS(sqsConfig),
         };
     }

     async getQueueUrl() {
         const {
             QueueUrl
         } = await this._sqsSvc.getQueueUrl({
             QueueName: this.queueName
         }).promise();

         return QueueUrl;
     }


     processDataOnDemand(queueUrl) {
         const writetableStream = new Writable({
             write: (chunk, encondig, done) => {
                 const item = chunk.toString();
                 console.log(`Sending item ${item} at ${new Date().toISOString}`);
                 this._sqsSvc.sendMessage({
                     QueueUrl: queueUrl,
                     MessageBody: item
                 }, done);
             }
         });

         return writetableStream;
     }

     async pipefyStreams(...args) {
         return new Promise((resolve, reject) => {
             pipeline(...args,
                 error => error ? reject(error) : resolve())
         });
     }


     async main(event) {


         const [{
             s3: {
                 bucket: {
                     name
                 },
                 object: {
                     key
                 }
             }
         }] = event.Records;

         console.log(`processing... ${name} - ${key}`);

         try {

             console.log('getting queue url..');

             const queueUrl = await this.getQueueUrl();
             const params = {
                 Bucket: name,
                 Key: key,
             };


             await this.pipefyStreams(
                 this._s3Svc.getObject(params).createReadStream(),
                 csvtojson(),
                 this.processDataOnDemand(queueUrl),
             );
             console.log(`process finished ${new Date().toISOString()}`);

             return {
                 statusCode: 200,
                 body: 'process finished with success!'
             }
         } catch (error) {
             console.log('***error', error.stack);
             return {
                 statusCode: 500,
                 body: 'Internal Error'
             }

         }
     }
 }
 const {
     s3,
     sqs
 } = Handler.getSdks();

 const myHandler = new Handler({
     s3Svc: s3,
     sqsSvc: sqs,
 });
 module.exports = myHandler.main.bind(myHandler);