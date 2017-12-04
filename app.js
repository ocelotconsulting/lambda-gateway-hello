const doMyStuff = (event, context, callback) => {
  console.log(`The event is ${JSON.stringify(event)}`)
  console.log(`Time to call callback`)
  callback(null, lambdaProxyResponse(200, `Hello from Lambda ${event.queryStringParameters.foo}!`))
}

// The output from a Lambda proxy integration must be
// of the following JSON object. The 'headers' property
// is for custom response headers in addition to standard
// ones. The 'body' property  must be a JSON string. For
// base64-encoded payload, you must also set the 'isBase64Encoded'
// property to 'true'.
const lambdaProxyResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'x-custom-header': 'my custom header value'
  },
  body: JSON.stringify(body)
})

module.exports = { handler: doMyStuff }
