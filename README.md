# lambda-gateway-hello

This project pulls together pieces to expose a lambda via the AWS API Gateway in a simple manner, utilizing a custom authorizer.

## Deployment

1. First deploy the package to S3, to assist in the next deployment step.
```
aws cloudformation package \
    --template-file cf-deploy.json \
    --s3-bucket <artifact-bucket-here> \
    --output-template-file cf-deploy-packaged.yaml
```

2. Next, deploy the stack to AWS, so that it can be executed.
```
aws cloudformation deploy \
    --template-file cf-deploy-packaged.yaml \
    --stack-name hello-gateway \
    --capabilities CAPABILITY_IAM
```

3. The cloudformation template outputs a variable called `HelloAPIInvokeURL` which contains the generated API Gateway URL that can be used to call the lambda via HTTP(s).
