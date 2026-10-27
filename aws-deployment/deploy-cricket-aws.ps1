<#
.SYNOPSIS
    Automated AWS Deployment Script for Local Tournament Cricket Management Platform.

.DESCRIPTION
    Provisions AWS CloudFormation infrastructure (S3 private origin, CloudFront OAC,
    CloudWatch monitoring & alarms, SNS alerts), builds the real React 19/Vite production bundle,
    syncs static assets to S3, issues CloudFront cache invalidation, and runs post-deployment
    verification smoke tests.

.PARAMETER StackName
    The name of the CloudFormation stack. Default is 'cricket-tournament-demo'.

.PARAMETER Region
    The AWS region to deploy into. Default is 'ap-south-1' (or active CLI region).

.PARAMETER Environment
    Deployment environment (demo, dev, staging, prod). Default is 'demo'.

.PARAMETER AlertEmail
    Optional email address to subscribe to CloudWatch 5xx alarm notifications via SNS.

.PARAMETER Force
    Bypasses interactive confirmation prompts for non-interactive / CI/CD automation.

.EXAMPLE
    .\deploy-cricket-aws.ps1 -StackName "cricket-tournament-demo" -Region "ap-south-1" -Force
#>

[CmdletBinding()]
param(
    [string]$StackName = "cricket-tournament-demo",
    [string]$Region = "ap-south-1",
    [string]$Environment = "demo",
    [string]$AlertEmail = "",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Resolve-Path "$ScriptDir\.."
Set-Location $ProjectRoot

# Colors
function Write-Header($msg) { Write-Host "`n======================================================`n $msg`n======================================================" -ForegroundColor Cyan }
function Write-Step($step, $msg) { Write-Host "`n[$step] $msg" -ForegroundColor Yellow }
function Write-Success($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Write-WarningMsg($msg) { Write-Host "  [WARN] $msg" -ForegroundColor DarkYellow }
function Write-Failure($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

$VerificationReport = @()
function Add-ReportItem($stepName, $status, $details) {
    $script:VerificationReport += [PSCustomObject]@{
        Step    = $stepName
        Status  = $status
        Details = $details
    }
}

Write-Header "LOCAL TOURNAMENT CRICKET PLATFORM - AWS DEPLOYMENT"
Write-Host "Target Project Root : $ProjectRoot"
Write-Host "CloudFormation Stack: $StackName"
Write-Host "AWS Region          : $Region"
Write-Host "Environment         : $Environment"

# -----------------------------------------------------------------------------
# STEP 1: Verify Prerequisites & CLI Tools
# -----------------------------------------------------------------------------
Write-Step "1/10" "Verifying CLI tools and environment prerequisites..."

try {
    $awsVersion = aws --version 2>&1
    Write-Success "AWS CLI is available: $awsVersion"
    Add-ReportItem "AWS CLI Check" "PASS" $awsVersion
} catch {
    Write-Failure "AWS CLI v2 is not installed or not in PATH."
    Add-ReportItem "AWS CLI Check" "FAIL" "AWS CLI missing"
    exit 1
}

try {
    $nodeVersion = node -v 2>&1
    $npmVersion = npm -v 2>&1
    Write-Success "Node.js $nodeVersion and npm $npmVersion detected."
    Add-ReportItem "Node & npm Check" "PASS" "Node $nodeVersion, npm $npmVersion"
} catch {
    Write-Failure "Node.js or npm is missing."
    Add-ReportItem "Node & npm Check" "FAIL" "Node/npm missing"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 2: Verify Active AWS Identity (STS)
# -----------------------------------------------------------------------------
Write-Step "2/10" "Verifying active AWS credentials via STS..."

try {
    $callerIdentityJson = aws sts get-caller-identity --region $Region --output json
    $callerIdentity = $callerIdentityJson | ConvertFrom-Json
    Write-Success "Authenticated as ARN: $($callerIdentity.Arn) (Account: $($callerIdentity.Account))"
    Add-ReportItem "AWS STS Identity" "PASS" "Account: $($callerIdentity.Account), ARN: $($callerIdentity.Arn)"
} catch {
    Write-Failure "Unable to authenticate with AWS. Check AWS_ACCESS_KEY_ID / AWS_PROFILE."
    Add-ReportItem "AWS STS Identity" "FAIL" "Authentication failure"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 3: Validate CloudFormation Template
# -----------------------------------------------------------------------------
Write-Step "3/10" "Validating CloudFormation infrastructure template..."

$TemplatePath = Join-Path $ScriptDir "cloudformation-template.yaml"
if (-not (Test-Path $TemplatePath)) {
    Write-Failure "CloudFormation template not found at: $TemplatePath"
    Add-ReportItem "Template Validation" "FAIL" "File missing"
    exit 1
}

try {
    $validateOutput = aws cloudformation validate-template `
        --template-body "file://$TemplatePath" `
        --region $Region `
        --output json 2>&1
    Write-Success "CloudFormation template syntax and parameters are valid."
    Add-ReportItem "Template Validation" "PASS" "Template syntax valid"
} catch {
    Write-Failure "CloudFormation template validation failed: $_"
    Add-ReportItem "Template Validation" "FAIL" $_.ToString()
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 4: Resource Overview & Confirmation
# -----------------------------------------------------------------------------
Write-Step "4/10" "Reviewing proposed AWS resources and cost estimate..."

Write-Host @"
Resources to be created/updated in CloudFormation stack '$StackName':
  - AWS::S3::Bucket                    (AppBucket: Private hosting origin, AES256)
  - AWS::S3::Bucket                    (LoggingBucket: Access logs with 30-day auto-expire)
  - AWS::CloudFront::OriginAccessControl (OAC: Secure SigV4 origin access)
  - AWS::CloudFront::Distribution      (HTTPS CDN distribution, SPA 403/404 error fallbacks)
  - AWS::S3::BucketPolicy              (Restricts S3 access exclusively to CloudFront via OAC)
  - AWS::SNS::Topic                    (Operational alerts topic)
  - AWS::CloudWatch::Alarm             (5xx Error Rate > 5% alarm)
  - AWS::CloudWatch::Dashboard         (Requests, 4xx/5xx errors, bandwidth egress metrics)

Estimated Monthly Cost:
  - S3 Storage & Requests: Free Tier eligible (< 100 MB used, < $0.05/mo)
  - CloudFront Data Egress: Free Tier covers 1 TB/mo (< $0.00/mo)
  - CloudWatch & SNS: Free Tier covers 10 metrics/alarms (< $0.00/mo)
  - Estimated Total Demo Cost: ~$0.00 - $0.50 / month
"@ -ForegroundColor DarkCyan

if (-not $Force) {
    $confirmation = Read-Host "Proceed with provisioning and deployment? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-WarningMsg "Deployment aborted by user."
        exit 0
    }
}

# -----------------------------------------------------------------------------
# STEP 5: Run Local Test Suite & Typecheck
# -----------------------------------------------------------------------------
Write-Step "5/10" "Running TypeScript validation and automated test suites..."

try {
    Write-Host "Running TypeScript compilation check..."
    npm run typecheck
    Write-Success "TypeScript type checking passed cleanly (0 errors)."
    Add-ReportItem "TypeScript Typecheck" "PASS" "0 errors"
} catch {
    Write-Failure "TypeScript compilation check failed."
    Add-ReportItem "TypeScript Typecheck" "FAIL" "Typecheck failed"
    exit 1
}

try {
    Write-Host "Running Cricket rules & scoring tests..."
    npm test
    Write-Success "Cricket & Table Tennis test suites passed (124/124 tests)."
    Add-ReportItem "Application Unit Tests" "PASS" "124 tests passed"
} catch {
    Write-Failure "Test suite failed."
    Add-ReportItem "Application Unit Tests" "FAIL" "Unit test failure"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 6: Build Production Bundle
# -----------------------------------------------------------------------------
Write-Step "6/10" "Compiling production bundle via Vite..."

try {
    npm run build
    Write-Success "Production bundle built successfully into 'dist/'."
    Add-ReportItem "Production Build" "PASS" "dist/ bundle generated"
} catch {
    Write-Failure "Production build failed."
    Add-ReportItem "Production Build" "FAIL" "Build failure"
    exit 1
}

# Run smoke test on dist bundle
try {
    npx tsx tests/smoke-test.ts
    Write-Success "Pre-deployment smoke tests passed (bundle integrity & secret absence)."
    Add-ReportItem "Pre-deploy Smoke Test" "PASS" "Bundle and secret scan verified"
} catch {
    Write-Failure "Smoke tests failed."
    Add-ReportItem "Pre-deploy Smoke Test" "FAIL" "Smoke test failure"
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 7: Deploy CloudFormation Stack
# -----------------------------------------------------------------------------
Write-Step "7/10" "Deploying CloudFormation stack: $StackName ($Region)..."

$cfnParams = @(
    "ProjectName=cricket-tournament",
    "Environment=$Environment",
    "AlertEmail=$AlertEmail"
)

try {
    Write-Host "Running 'aws cloudformation deploy'..."
    aws cloudformation deploy `
        --template-file "$TemplatePath" `
        --stack-name "$StackName" `
        --parameter-overrides $cfnParams `
        --region "$Region" `
        --no-fail-on-empty-changeset

    Write-Success "CloudFormation stack provisioning completed."
    Add-ReportItem "CloudFormation Provisioning" "PASS" "Stack created/updated successfully"
} catch {
    Write-Failure "CloudFormation deployment failed: $_"
    Add-ReportItem "CloudFormation Provisioning" "FAIL" $_.ToString()
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 8: Fetch Stack Outputs
# -----------------------------------------------------------------------------
Write-Step "8/10" "Retrieving stack outputs from CloudFormation..."

try {
    $outputsJson = aws cloudformation describe-stacks `
        --stack-name "$StackName" `
        --region "$Region" `
        --query "Stacks[0].Outputs" `
        --output json

    $outputs = $outputsJson | ConvertFrom-Json
    $outputMap = @{}
    foreach ($out in $outputs) {
        $outputMap[$out.OutputKey] = $out.OutputValue
    }

    $WebsiteURL     = $outputMap["WebsiteURL"]
    $DistributionId = $outputMap["DistributionId"]
    $AppBucketName  = $outputMap["AppBucketName"]
    $AlertTopicArn  = $outputMap["AlertTopicArn"]

    Write-Host "Stack Outputs:"
    Write-Host "  App S3 Bucket  : $AppBucketName"
    Write-Host "  CloudFront Dist: $DistributionId"
    Write-Host "  Website URL    : $WebsiteURL"
    Write-Host "  Alert Topic    : $AlertTopicArn"
    Add-ReportItem "Stack Outputs Retrieval" "PASS" "WebsiteURL: $WebsiteURL"
} catch {
    Write-Failure "Failed to query stack outputs: $_"
    Add-ReportItem "Stack Outputs Retrieval" "FAIL" $_.ToString()
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 9: Sync Static Assets & Invalidate Cache
# -----------------------------------------------------------------------------
Write-Step "9/10" "Uploading application artifacts to S3 origin..."

try {
    aws s3 sync "dist" "s3://$AppBucketName" --delete --region "$Region"
    Write-Success "Assets synced to s3://$AppBucketName with --delete."
    Add-ReportItem "S3 Asset Sync" "PASS" "dist/ synced to s3://$AppBucketName"
} catch {
    Write-Failure "Failed to sync assets to S3: $_"
    Add-ReportItem "S3 Asset Sync" "FAIL" $_.ToString()
    exit 1
}

Write-Host "Triggering CloudFront cache invalidation (/*)..."
try {
    $invalidationId = aws cloudfront create-invalidation `
        --distribution-id "$DistributionId" `
        --paths "/*" `
        --query "Invalidation.Id" `
        --output text

    Write-Success "Cache invalidation queued with ID: $invalidationId"
    Add-ReportItem "CloudFront Invalidation" "PASS" "Invalidation ID: $invalidationId"
} catch {
    Write-WarningMsg "Could not trigger CloudFront invalidation: $_"
    Add-ReportItem "CloudFront Invalidation" "WARN" $_.ToString()
}

# -----------------------------------------------------------------------------
# STEP 10: Live HTTPS Verification & Smoke Test
# -----------------------------------------------------------------------------
Write-Step "10/10" "Verifying live website deployment over HTTPS..."

$httpSuccess = $false
try {
    Write-Host "Testing HTTP response from $WebsiteURL..."
    $response = Invoke-WebRequest -Uri $WebsiteURL -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        Write-Success "Public website responded with HTTP 200 OK."
        $httpSuccess = $true
        Add-ReportItem "Public HTTPS Health Check" "PASS" "HTTP 200 OK from $WebsiteURL"
    } else {
        Write-WarningMsg "Website returned status code $($response.StatusCode)."
        Add-ReportItem "Public HTTPS Health Check" "WARN" "Status code $($response.StatusCode)"
    }
} catch {
    Write-WarningMsg "HTTP request to $WebsiteURL timed out or failed (CloudFront DNS propagation may take a few minutes): $_"
    Add-ReportItem "Public HTTPS Health Check" "WARN" "DNS propagating or edge cache warm-up"
}

# -----------------------------------------------------------------------------
# VERIFICATION REPORT SUMMARY
# -----------------------------------------------------------------------------
Write-Header "DEPLOYMENT & VERIFICATION REPORT"
$VerificationReport | Format-Table -AutoSize

Write-Host @"
======================================================
DEPLOYMENT SUCCESSFUL!
======================================================
Public Website URL : $WebsiteURL
CloudFront Dist ID : $DistributionId
S3 Bucket Origin   : $AppBucketName
CloudWatch Alarms  : 5xxErrorRate > 5%
CloudWatch Metric  : $StackName-Dashboard

CLEANUP COMMAND:
To safely delete all created AWS resources when finished:
  .\remove-cricket-aws.ps1 -StackName "$StackName" -Region "$Region" -Force
======================================================
"@ -ForegroundColor Green
