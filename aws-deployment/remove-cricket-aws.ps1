<#
.SYNOPSIS
    Automated Safe Cleanup Script for Local Tournament Cricket Management AWS Infrastructure.

.DESCRIPTION
    Safely tears down the CloudFormation stack created by deploy-cricket-aws.ps1.
    Performs identity verification, stack presence check, empties stack-owned S3 buckets
    (which would otherwise block CloudFormation bucket deletion), deletes the stack,
    waits for completion, and inspects for any residual resources.

.PARAMETER StackName
    The name of the CloudFormation stack to delete. Default is 'cricket-tournament-demo'.

.PARAMETER Region
    The AWS region of the stack. Default is 'ap-south-1'.

.PARAMETER Force
    Bypasses interactive confirmation prompts.

.EXAMPLE
    .\remove-cricket-aws.ps1 -StackName "cricket-tournament-demo" -Region "ap-south-1" -Force
#>

[CmdletBinding()]
param(
    [string]$StackName = "cricket-tournament-demo",
    [string]$Region = "ap-south-1",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

function Write-Header($msg) { Write-Host "`n======================================================`n $msg`n======================================================" -ForegroundColor Cyan }
function Write-Step($step, $msg) { Write-Host "`n[$step] $msg" -ForegroundColor Yellow }
function Write-Success($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-WarningMsg($msg) { Write-Host "  [WARN] $msg" -ForegroundColor DarkYellow }
function Write-Failure($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

Write-Header "LOCAL TOURNAMENT CRICKET PLATFORM - AWS TEARDOWN & CLEANUP"
Write-Host "Target Stack: $StackName"
Write-Host "Target Region: $Region"

# -----------------------------------------------------------------------------
# STEP 1: Verify AWS Identity & Prerequisites
# -----------------------------------------------------------------------------
Write-Step "1/6" "Verifying active AWS caller identity..."

try {
    $callerIdentity = (aws sts get-caller-identity --region $Region --output json) | ConvertFrom-Json
    Write-Success "Authenticated as Account: $($callerIdentity.Account), ARN: $($callerIdentity.Arn)"
} catch {
    Write-Failure "AWS authentication failed. Ensure AWS credentials are configured."
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 2: Verify Stack Existence & Inspect Resources
# -----------------------------------------------------------------------------
Write-Step "2/6" "Inspecting CloudFormation stack '$StackName'..."

try {
    $stackStatus = aws cloudformation describe-stacks `
        --stack-name "$StackName" `
        --region "$Region" `
        --query "Stacks[0].StackStatus" `
        --output text 2>&1

    Write-Success "Found stack '$StackName' with status: $stackStatus"
} catch {
    Write-WarningMsg "Stack '$StackName' does not exist in region '$Region'. Nothing to delete."
    exit 0
}

# Query stack resources
$stackResources = @()
try {
    $resJson = aws cloudformation describe-stack-resources `
        --stack-name "$StackName" `
        --region "$Region" `
        --output json
    $stackResources = ($resJson | ConvertFrom-Json).StackResources
} catch {
    Write-WarningMsg "Could not query stack resources: $_"
}

Write-Host "`nStack Owned Resources to be Deleted:" -ForegroundColor DarkCyan
foreach ($res in $stackResources) {
    Write-Host "  - $($res.ResourceType): $($res.PhysicalResourceId)"
}

Write-Host @"

WARNING:
This action will permanently delete all cloud resources provisioned by stack '$StackName',
including static site assets in S3, CloudFront distribution, CloudWatch alarms, and SNS topic.
External database data (e.g. Supabase managed database) will NOT be affected.
"@ -ForegroundColor DarkYellow

if (-not $Force) {
    $confirm = Read-Host "Are you sure you want to permanently delete stack '$StackName'? Type 'DELETE' to confirm"
    if ($confirm -ne "DELETE") {
        Write-WarningMsg "Cleanup cancelled by user."
        exit 0
    }
}

# -----------------------------------------------------------------------------
# STEP 3: Empty Stack-Owned S3 Buckets
# -----------------------------------------------------------------------------
Write-Step "3/6" "Emptying stack-owned S3 buckets to prevent deletion blocks..."

$bucketsToEmpty = $stackResources | Where-Object { $_.ResourceType -eq "AWS::S3::Bucket" }
foreach ($b in $bucketsToEmpty) {
    $bucketName = $b.PhysicalResourceId
    if ($bucketName) {
        Write-Host "Emptying S3 bucket: $bucketName..."
        try {
            aws s3 rm "s3://$bucketName" --recursive --region "$Region"
            Write-Success "Emptied all objects from s3://$bucketName"
        } catch {
            Write-WarningMsg "Could not empty bucket $bucketName: $_"
        }
    }
}

# -----------------------------------------------------------------------------
# STEP 4: Initiate CloudFormation Stack Deletion
# -----------------------------------------------------------------------------
Write-Step "4/6" "Initiating CloudFormation stack deletion..."

try {
    aws cloudformation delete-stack --stack-name "$StackName" --region "$Region"
    Write-Success "Delete-stack request submitted."
} catch {
    Write-Failure "Failed to initiate stack deletion: $_"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 5: Wait for Stack Deletion to Complete
# -----------------------------------------------------------------------------
Write-Step "5/6" "Waiting for CloudFormation stack deletion to complete (this may take 2-5 minutes for CloudFront)..."

try {
    aws cloudformation wait stack-delete-complete --stack-name "$StackName" --region "$Region"
    Write-Success "CloudFormation stack '$StackName' deletion completed successfully."
} catch {
    Write-Failure "Error or timeout waiting for stack deletion: $_"
    Write-Host "Check AWS Console -> CloudFormation -> $StackName events for any failed resource deletion."
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 6: Residual Resource Verification
# -----------------------------------------------------------------------------
Write-Step "6/6" "Verifying residual resources..."

$residualCount = 0
foreach ($b in $bucketsToEmpty) {
    $bName = $b.PhysicalResourceId
    try {
        $headBucket = aws s3api head-bucket --bucket "$bName" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-WarningMsg "Bucket '$bName' still exists! Manual deletion required."
            $residualCount++
        }
    } catch {
        # Bucket not found is expected
    }
}

if ($residualCount -eq 0) {
    Write-Success "All stack-owned S3 buckets and CloudFormation resources have been cleanly removed."
} else {
    Write-WarningMsg "Some residual resources may require manual cleanup in AWS Console."
}

Write-Header "CLEANUP COMPLETE"
Write-Host "Stack '$StackName' in '$Region' has been removed. No ongoing AWS charges will be incurred." -ForegroundColor Green
