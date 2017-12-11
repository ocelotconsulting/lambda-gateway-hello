# lambda-gateway-hello

This project pulls together pieces to expose a lambda via the AWS API Gateway in a simple manner, utilizing a [custom authorizer](https://github.com/ocelotconsulting/sample-custom-authorizer).

## Dependencies

This lambda utilizes another related lambda used as a [Custom Authorizer](http://docs.aws.amazon.com/apigateway/latest/developerguide/use-custom-authorizer.html), which the cloudformation template within this project [imports](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html) from the following name `AuthorizerARN`.

## IAM

The lambda CI/CD will need permissions similar to those found in [this JSON file](./iam.json)

## Deployment

1. First build the zip file that will be used as the lambda function source
```
npm run clean; npm run dist
```

2. Then deploy the package to S3, to assist in the next deployment step.
```
aws cloudformation package \
    --template-file cf.json \
    --s3-bucket <artifact-bucket-here> \
    --output-template-file cf-packaged.yaml
```

3. Next, deploy the stack to AWS, so that it can be executed.
```
aws cloudformation deploy \
    --template-file cf-packaged.yaml \
    --stack-name hello-api \
    --capabilities CAPABILITY_IAM
```

4. Now the lambda exists, along with an AWS API Gateway entry to expose it. The AWS API Gateway is established to call 2 versions of the lambda (labeled with aliases `PROD` and `TEST`, both initially pointed to `$LATEST`). The next steps will be to create the real aliased versions. We publish `$LATEST` as version `1` of the Lambda function, and also initially set both `TEST` and `PROD` to that. Eventually `TEST` will move ahead of prod to a newer version, but then at some point after in the future, `PROD` will point to the same function as `TEST` until `TEST` is yet again moved forward.

To create the initial `TEST` version and set the alias to it:

```
lambda_arn=$(aws cloudformation describe-stacks --stack-name hello-api --output json | jq -r '.Stacks[0].Outputs[2].OutputValue')

lambda_version=$(aws lambda publish-version \
    --function-name $lambda_arn \
    --description "New version of hello Lambda" | jq -r '.Version')

aws lambda update-alias \
  --function-name $lambda_arn \
  --name TEST \
  --function-version $lambda_version
```

Now that `TEST` has been assigned to a version, from time to time we will want to update `PROD` to the latest version under `TEST`. In order do do that, it is similar to the last step.

```
test_version=$(aws lambda list-aliases \
  --function-name $lambda_arn \
  --output json | jq -r '.Aliases | map(select(.Name == "TEST")) | .[].FunctionVersion')

if [ "$test_version" ]; then \
  aws lambda update-alias \
    --function-name $lambda_arn \
    --name PROD \
    --function-version $test_version; else \
  echo "No version applicable for prod promotion."; \
fi
```

5. Finally, you can access the API via the gateway as in the following commands:

```
test_url=$(aws cloudformation describe-stacks --stack-name hello-api --output json | jq -r '.Stacks[0].Outputs[1].OutputValue')

prod_url=$(aws cloudformation describe-stacks --stack-name hello-api --output json | jq -r '.Stacks[0].Outputs[0].OutputValue')
```
