# lambda-gateway-hello

This project pulls together pieces to expose a lambda via the AWS API Gateway in a simple manner, utilizing a [custom authorizer](https://github.com/ocelotconsulting/sample-custom-authorizer).

## Dependencies

This lambda utilizes another related lambda used as a [Custom Authorizer](http://docs.aws.amazon.com/apigateway/latest/developerguide/use-custom-authorizer.html), which the cloudformation template within this project [imports](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html) from the following name `AuthorizerARN`.

## IAM

The lambda CI/CD will need permissions similar to those found in [this JSON file](./iam.json). Some of the permissions aren't completely necessary unless you are modifying DNS/adding a custom domain to the API, but if you check out the [commit history](https://github.com/ocelotconsulting/lambda-gateway-hello/commit/160522ed324c14796b62e798ab42e350c3a4efd6#diff-93739abfc3a09478d61aafc4275296fb) it isn't too difficult to figure out.

## Deployment

1. First build the zip file that will be used as the lambda function source
```bash
npm run clean; npm run dist
```

2. Then deploy the package to S3, to assist in the next deployment step.
```bash
aws cloudformation package \
    --template-file cf.json \
    --s3-bucket <artifact-bucket-here> \
    --output-template-file cf-packaged.yaml
```

3. Next, deploy the stack to AWS, so that it can be executed.
```bash
aws cloudformation deploy \
    --template-file cf-packaged.yaml \
    --stack-name hello-api \
    --capabilities CAPABILITY_IAM
```

4. Now the lambda exists, along with an AWS API Gateway entry to expose it. The AWS API Gateway is established to call 2 versions of the lambda (labeled with aliases `PROD` and `TEST`, both initially pointed to `$LATEST`). The next steps will be to create the real aliased versions. We publish `$LATEST` as version `1` of the Lambda function, and also initially set both `TEST` and `PROD` to that. Eventually `TEST` will move ahead of prod to a newer version, but then at some point after in the future, `PROD` will point to the same function as `TEST` until `TEST` is yet again moved forward.

To create the initial `TEST` version and set the alias to it:

```bash
lambda_arn=$(aws cloudformation describe-stacks --stack-name hello-api --output json | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "ARN") | .OutputValue')

lambda_version=$(aws lambda publish-version \
    --function-name $lambda_arn \
    --description "New version of hello Lambda" | jq -r '.Version')

aws lambda update-alias \
  --function-name $lambda_arn \
  --name TEST \
  --function-version $lambda_version
```

Now that `TEST` has been assigned to a version, from time to time we will want to update `PROD` to the latest version under `TEST`. In order do do that, it is similar to the last step.

```bash
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

```bash
test_url=$(aws cloudformation describe-stacks --stack-name hello-api --output json | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "TestInvokeURL") | .OutputValue')

prod_url=$(aws cloudformation describe-stacks --stack-name hello-api --output json | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "ProdInvokeURL") | .OutputValue')
```

## Optionally link a domain name

1. First import your certificate for your domain. You can use cloudformation, sdk [like this](https://github.com/ocelotconsulting/node-letsencrypt-lambda/blob/master/bin/importToACM.js), or the CLI. I've chosen not to do it as part of the cloudformation template here.

2. After the certificate is imported, get the ARN for the certificate, and the hosted zone which will host the DNS alias record, and run the [domain cloudformation template](./cf-domain.json).

```bash
cert_arn=$(aws acm list-certificates | jq -r '.CertificateSummaryList[] | select(.DomainName == "hello.mydomain.com") | .CertificateArn')

hosted_zone=$(aws route53 list-hosted-zones | jq -r '.HostedZones[] | select(.Name == "mydomain.com.") | .Id')

aws cloudformation deploy --template-file cf-domain.json --stack-name hello-api-domain --capabilities CAPABILITY_IAM --parameter-overrides APICertificate=$cert_arn HostedZoneId=$hosted_zone
```

## Swagger Alternative

You can substitute the [swagger CloudFormation template](./cf-swagger.json) for the original CloudFormation template if you would prefer to create the AWS resources via documentation. If you do run the swagger template, when completed you can export the documentation using either the [secured HTTP](Making HTTP Requests) [method](http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-export-api.html) or [utilizing the CLI](http://docs.aws.amazon.com/cli/latest/reference/apigateway/get-export.html) like the following:

```bash
aws apigateway get-export --rest-api-id 1u0vc0jc2g --stage-name v1 --export-type swagger swagger.json
```
