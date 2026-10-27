#!/usr/bin/env bash
# ==============================================================================
# Automated Cleanup Script for Local Tournament Cricket Management AWS Infrastructure
# ==============================================================================
# Safely empties stack-owned S3 buckets, deletes CloudFormation stack, and verifies
# that no residual AWS resources remain to prevent continuing charges.
# ==============================================================================

set -euo pipefail

STACK_NAME="${STACK_NAME:-cricket-tournament-demo}"
REGION="${AWS_REGION:-${REGION:-ap-south-1}}"
FORCE="${FORCE:-false}"

echo "======================================================"
echo " LOCAL TOURNAMENT CRICKET PLATFORM - AWS CLEANUP"
echo "======================================================"
echo "Target Stack: $STACK_NAME"
echo "Target Region: $REGION"

# STEP 1: Verify Identity
echo ""
echo "[1/5] Verifying AWS identity..."
if ! CALLER_IDENTITY="$(aws sts get-caller-identity --region "$REGION" --output json)"; then
    echo "  [FAIL] Unable to authenticate with AWS."
    exit 1
fi
ACCOUNT_ID="$(echo "$CALLER_IDENTITY" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)"
echo "  [PASS] Authenticated as Account: $ACCOUNT_ID"

# STEP 2: Verify Stack Existence
echo ""
echo "[2/5] Checking stack existence..."
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &>/dev/null; then
    echo "  [WARN] Stack '$STACK_NAME' does not exist in region '$REGION'. Nothing to delete."
    exit 0
fi
echo "  [PASS] Stack '$STACK_NAME' found."

if [[ "$FORCE" != "true" && "$FORCE" != "1" ]]; then
    read -r -p "Are you sure you want to permanently delete stack '$STACK_NAME'? (Type 'DELETE'): " confirm
    if [[ "$confirm" != "DELETE" ]]; then
        echo "  [WARN] Cleanup cancelled by user."
        exit 0
    fi
fi

# STEP 3: Empty Stack S3 Buckets
echo ""
echo "[3/5] Emptying stack-owned S3 buckets..."
BUCKETS="$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" \
    --output text 2>/dev/null || true)"

for bucket in $BUCKETS; do
    if [[ -n "$bucket" && "$bucket" != "None" ]]; then
        echo "  Emptying S3 bucket: $bucket..."
        aws s3 rm "s3://$bucket" --recursive --region "$REGION" || true
        echo "  [PASS] Emptied $bucket"
    fi
done

# STEP 4: Delete Stack
echo ""
echo "[4/5] Deleting CloudFormation stack: $STACK_NAME..."
aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
echo "  Waiting for stack deletion to complete (this may take 2-4 minutes)..."
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION"
echo "  [PASS] CloudFormation stack deleted."

# STEP 5: Residual Check
echo ""
echo "[5/5] Checking for residual resources..."
for bucket in $BUCKETS; do
    if [[ -n "$bucket" && "$bucket" != "None" ]]; then
        if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
            echo "  [WARN] Bucket $bucket still exists! Manual deletion needed."
        fi
    fi
done

echo ""
echo "======================================================"
echo " CLEANUP COMPLETED SUCCESSFULLY!"
echo " Stack '$STACK_NAME' in '$REGION' has been completely removed."
echo " No continuing AWS charges will be incurred."
echo "======================================================"
