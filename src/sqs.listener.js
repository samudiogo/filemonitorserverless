class Handler {
    async main(event) {

        try {

            const [{
                body,
                messageId,
            }] = event.Records;
            const item = JSON.parse(body);
            const messageReceived = JSON.stringify({
                ...item,
                messageId,
                at: new Date().toISOString(),
            });
            return {
                statusCode: 200,
                body: `***event ${messageReceived}`
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

const myHandler = new Handler();
module.exports = myHandler.main.bind(myHandler);