class Handler {
    async main(event) {
        try {
            return {
                statusCode: 200,
                body: 'hello'
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