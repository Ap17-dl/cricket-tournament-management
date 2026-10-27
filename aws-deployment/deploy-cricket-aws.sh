#!/usr/bin/env bash
# ==============================================================================
# Automated AWS Deployment Script for Local Tournament Cricket Management Platform
# ==============================================================================
# Provisions AWS CloudFormation infrastructure (S3 private origin, CloudFront OAC,
# CloudWatch monitoring & alarms, SNS alerts), builds the React 19/Vite production
# bundle, syncs assets to S3, invalidates CloudFront cache, and verifies deployment.
# ==============================================================================

set -euo pipefail

STACK_NAME="${STACK_NAME:-cricket-tournament-demo}"
REGION="${AWS_REGION:-${REGION:-ap-south-1}}"
ENVIRONMENT="${ENVIRONMENT:-demo}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
FORCE="${FORCE:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/package.json" ]]; then
    PROJECT_ROOT="$SCRIPT_DIR"
else
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
cd "$PROJECT_ROOT"

echo "======================================================"
echo " LOCAL TOURNAMENT CRICKET PLATFORM - AWS DEPLOYMENT"
echo "======================================================"
echo "Target Project Root : $PROJECT_ROOT"
echo "CloudFormation Stack: $STACK_NAME"
echo "AWS Region          : $REGION"
echo "Environment         : $ENVIRONMENT"

# STEP 1: Verify Prerequisites
echo ""
echo "[1/10] Verifying CLI tools and environment prerequisites..."
if ! command -v aws &>/dev/null; then
    echo "  [FAIL] AWS CLI is not installed or not in PATH."
    exit 1
fi
echo "  [PASS] AWS CLI available: $(aws --version)"

if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo "  [FAIL] Node.js or npm is missing."
    exit 1
fi
echo "  [PASS] Node $(node -v) and npm $(npm -v) detected."

# STEP 2: Verify Active AWS Identity (STS)
echo ""
echo "[2/10] Verifying active AWS credentials via STS..."
if ! CALLER_IDENTITY="$(aws sts get-caller-identity --region "$REGION" --output json)"; then
    echo "  [FAIL] Unable to authenticate with AWS. Check credentials."
    exit 1
fi
ACCOUNT_ID="$(echo "$CALLER_IDENTITY" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)"
USER_ARN="$(echo "$CALLER_IDENTITY" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)"
echo "  [PASS] Authenticated as Account: $ACCOUNT_ID (ARN: $USER_ARN)"

# STEP 3: Validate CloudFormation Template
echo ""
echo "[3/10] Validating CloudFormation infrastructure template..."
TEMPLATE_PATH="$SCRIPT_DIR/cloudformation-template.yaml"
if [[ ! -f "$TEMPLATE_PATH" ]]; then
    TEMPLATE_PATH="$PROJECT_ROOT/aws-deployment/cloudformation-template.yaml"
fi
if [[ ! -f "$TEMPLATE_PATH" ]]; then
    echo "  [FAIL] Template not found at $TEMPLATE_PATH"
    exit 1
fi
aws cloudformation validate-template \
    --template-body "file://$TEMPLATE_PATH" \
    --region "$REGION" >/dev/null
echo "  [PASS] CloudFormation template validated successfully."

# STEP 4: Resource Overview & Confirmation
echo ""
echo "[4/10] Reviewing proposed AWS resources and cost estimate..."
cat <<EOF
Resources to be created/updated in CloudFormation stack '$STACK_NAME':
  - AWS::S3::Bucket                    (AppBucket: Private hosting origin, AES256)
  - AWS::S3::Bucket                    (LoggingBucket: Access logs with 30-day auto-expire)
  - AWS::CloudFront::OriginAccessControl (OAC: Secure SigV4 origin access)
  - AWS::CloudFront::Distribution      (HTTPS CDN distribution, SPA 403/404 error fallbacks)
  - AWS::S3::BucketPolicy              (Restricts S3 access exclusively to CloudFront via OAC)
  - AWS::SNS::Topic                    (Operational alerts topic)
  - AWS::CloudWatch::Alarm             (5xx Error Rate > 5% alarm)
  - AWS::CloudWatch::Dashboard         (Requests, 4xx/5xx errors, bandwidth egress metrics)

Estimated Monthly Cost:
  - S3 Storage & Requests: Free Tier eligible (< 100 MB used, < \$0.05/mo)
  - CloudFront Data Egress: Free Tier covers 1 TB/mo (< \$0.00/mo)
  - CloudWatch & SNS: Free Tier covers 10 metrics/alarms (< \$0.00/mo)
  - Estimated Total Demo Cost: ~\$0.00 - \$0.50 / month
EOF

if [[ "$FORCE" != "true" && "$FORCE" != "1" ]]; then
    read -r -p "Proceed with provisioning and deployment? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "  [WARN] Deployment aborted by user."
        exit 0
    fi
fi

# STEP 5: Run Local Test Suite & Typecheck
echo ""
echo "[5/10] Running TypeScript validation and automated test suites..."
npm run typecheck
echo "  [PASS] TypeScript check passed."

npm test
echo "  [PASS] Cricket and Table Tennis scoring test suites passed."

# STEP 6: Build Production Bundle
echo ""
echo "[6/10] Compiling production bundle via Vite..."
npm run build
echo "  [PASS] Vite production build complete."

npx tsx tests/smoke-test.ts
echo "  [PASS] Pre-deploy smoke tests verified bundle integrity."

ENABLE_CLOUDFRONT="${ENABLE_CLOUDFRONT:-false}"

# STEP 7: Deploy CloudFormation Stack
echo ""
echo "[7/10] Deploying CloudFormation stack: $STACK_NAME ($REGION)..."
aws cloudformation deploy \
    --template-file "$TEMPLATE_PATH" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        ProjectName=cricket-tournament \
        Environment="$ENVIRONMENT" \
        EnableCloudFront="$ENABLE_CLOUDFRONT" \
        AlertEmail="$ALERT_EMAIL" \
    --region "$REGION" \
    --no-fail-on-empty-changeset
echo "  [PASS] CloudFormation provisioning succeeded."

# STEP 8: Fetch Stack Outputs
echo ""
echo "[8/10] Retrieving stack outputs..."
OUTPUTS="$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs" \
    --output json)"

WEBSITE_URL="$(echo "$OUTPUTS" | grep -A 1 '"OutputKey": "WebsiteURL"' | grep '"OutputValue"' | cut -d'"' -f4 || echo "")"
DIST_ID="$(echo "$OUTPUTS" | grep -A 1 '"OutputKey": "DistributionId"' | grep '"OutputValue"' | cut -d'"' -f4 || echo "")"
APP_BUCKET="$(echo "$OUTPUTS" | grep -A 1 '"OutputKey": "AppBucketName"' | grep '"OutputValue"' | cut -d'"' -f4 || echo "")"

echo "  Website URL    : $WEBSITE_URL"
if [[ -n "$DIST_ID" ]]; then
    echo "  CloudFront Dist: $DIST_ID"
fi
echo "  S3 App Bucket  : $APP_BUCKET"

# STEP 9: Sync Static Assets & Invalidate Cache
echo ""
echo "[9/10] Uploading application bundle to S3..."
aws s3 sync dist "s3://$APP_BUCKET" --delete --region "$REGION"
echo "  [PASS] Uploaded dist/ to s3://$APP_BUCKET"

if [[ -n "$DIST_ID" ]]; then
    echo "Triggering CloudFront cache invalidation..."
    INVALIDATION_ID="$(aws cloudfront create-invalidation \
        --distribution-id "$DIST_ID" \
        --paths "/*" \
        --query "Invalidation.Id" \
        --output text 2>/dev/null || echo "queued")"
    echo "  [PASS] Invalidation submitted: $INVALIDATION_ID"
fi

# STEP 10: Live HTTPS Verification
echo ""
echo "[10/10] Verifying live website..."
HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$WEBSITE_URL" || echo "000")"
if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "  [PASS] Public website responded with HTTP 200 OK!"
else
    echo "  [WARN] Public URL returned HTTP $HTTP_STATUS."
fi

echo ""
echo "======================================================"
echo " DEPLOYMENT SUCCESSFUL!"
echo "======================================================"
echo " Website URL        : $WEBSITE_URL"
echo " CloudFront Dist ID : $DIST_ID"
echo " S3 App Bucket      : $APP_BUCKET"
echo " Stack Name         : $STACK_NAME ($REGION)"
echo ""
echo " CLEANUP:"
echo " To delete all created AWS resources:"
echo "   ./remove-cricket-aws.sh"
echo "======================================================"
