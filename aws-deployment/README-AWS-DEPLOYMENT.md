# AWS Deployment & Infrastructure Guide
## Local Tournament / Cricket Tournament Management Platform

This document provides a comprehensive, production-grade guide for deploying the **Local Tournament Cricket Management Platform** onto Amazon Web Services (AWS) suitable for academic demonstration, evaluation, and live hosting.

---

## 1. Executive Summary & Architecture Overview

The application is a modern, responsive Single Page Application (SPA) built using **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**, backed by a managed **Supabase** infrastructure for PostgreSQL persistence, Row-Level Security (RLS), Supabase Auth, and real-time WebSocket scoring updates.

### High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT VIEWERS & USERS                               |
+-----------------------------------------------------------------------------------------+
                                 │                           │
                                 │ HTTPS (Port 443)          │ Direct Auth & Realtime
                                 ▼                           │ WebSockets
+------------------------------------------------------+     │
|               AMAZON CLOUDFRONT CDN                  |     │
|  - Global Edge Caching (TLS 1.2 / 1.3)               |     │
|  - Origin Access Control (SigV4 Signed S3 Requests)  |     │
|  - SPA Fallback Routing (403/404 -> index.html 200)  |     │
+------------------------------------------------------+     │
           │                                 │               │
           │ OAC Read                        │ Access Logs   │
           ▼                                 ▼               │
+-----------------------+         +--------------------+     │
|    S3 APP BUCKET      |         | S3 LOGGING BUCKET  |     │
|  - Private Web Origin |         |  - CloudFront Logs |     │
|  - AES256 Encryption  |         |  - S3 Access Logs  |     │
|  - Block Public Access|         |  - 30-day Expire   |     │
+-----------------------+         +--------------------+     │
                                                             │
+────────────────────────────────────────────────────────────┼────────────────────────────+
| AWS MONITORING & ALERTS                                    │
|  - CloudWatch Alarm: CloudFront 5xx Error Rate > 5%        │
|  - SNS Topic: 'cricket-tournament-alerts'                  │
|  - CloudWatch Dashboard: Requests, Error Rates, Egress     │
+────────────────────────────────────────────────────────────┼────────────────────────────+
                                                             │
                                                             ▼
                                      +---------------------------------------------+
                                      |            SUPABASE BACKEND (BaaS)          |
                                      |  - PostgreSQL Database (11 Tables with RLS) |
                                      |  - Supabase Auth (JWT & Role Handling)      |
                                      |  - Supabase Realtime (Ball-by-ball Events)  |
                                      |  - Deno Edge Functions (Career App Emails)  |
                                      +---------------------------------------------+
```

### AWS Resource Inventory

| AWS Resource Type | Resource Identifier | Purpose | Security & Cost Considerations |
| :--- | :--- | :--- | :--- |
| `AWS::S3::Bucket` | `${ProjectName}-${Env}-site-${AccountId}-${Region}` | Private hosting origin for compiled React/Vite assets | All public access blocked. AES256 encryption. Only CloudFront OAC can read. Free tier eligible. |
| `AWS::S3::Bucket` | `${ProjectName}-${Env}-logs-${AccountId}-${Region}` | Stores CloudFront and S3 access logs | Dedicated log delivery bucket. Auto-expires logs after 30 days via Lifecycle Rules to avoid runaway storage costs. |
| `AWS::CloudFront::OriginAccessControl` | `${ProjectName}-${Env}-oac` | Origin Access Control (OAC) | Replaces deprecated OAI. Uses SigV4 authentication between CloudFront edge and S3. |
| `AWS::CloudFront::Distribution` | `Distribution` | Content Delivery Network (CDN) | HTTPS termination, TLS 1.2+, Brotli/Gzip compression, SPA error mapping (403/404 -> `/index.html` with HTTP 200). |
| `AWS::S3::BucketPolicy` | `AppBucketPolicy` | S3 resource policy | Enforces TLS requests only and allows `s3:GetObject` strictly to the CloudFront distribution ARN. |
| `AWS::CloudWatch::Alarm` | `CloudFront5xxAlarm` | Alerts on high 5xx error rates | Monitors distribution 5xx rate > 5% over 5-minute evaluation periods. Sends notifications to SNS. |
| `AWS::SNS::Topic` | `AlertTopic` | Operational alert fan-out | Sends notifications to subscribed admin emails when CloudWatch alarms fire. |
| `AWS::CloudWatch::Dashboard` | `MonitoringDashboard` | Operational health dashboard | Visualizes request volume, 4xx/5xx error rates, and bandwidth egress over time. |

---

## 2. Prerequisites & Setup

### Required Tools
1. **AWS CLI v2**: Installed and configured (`aws configure`).
2. **Node.js (v18+ or v20+)** and **npm**: Installed.
3. **PowerShell 7+** (on Windows) OR **Bash / Zsh** (on macOS / Linux).

### Verifying AWS Identity
Before launching deployments, verify your active credentials:
```bash
aws sts get-caller-identity
```
Ensure the target region is set (e.g., `ap-south-1` or `us-east-1`):
```bash
aws configure get region
```

---

## 3. Environment Variables & Secret Safety

Copy `.env.example` to `.env.local` for local execution. Never commit `.env.local` or raw secret keys to GitHub.

```ini
# Client Variables (Injected into Vite client bundle at build time)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Server & Database Admin Variables (NEVER exposed to the browser)
VITE_POSTGRESQL_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
SUPABASE_SECRET_KEY=your-supabase-service-role-secret-key
SUPABASE_JWKS_URL=https://your-project-id.supabase.co/auth/v1/.well-known/jwks.json
RESEND_API_KEY=re_your_resend_api_key

# AWS Deployment Parameters
AWS_REGION=ap-south-1
STACK_NAME=cricket-tournament-demo
ALERT_EMAIL=admin@example.com
```

> **Security Note:** The automated smoke test (`npm test` and `npx tsx tests/smoke-test.ts`) inspects the compiled JavaScript and CSS output in `dist/assets/` to ensure no database passwords, service role keys, or Resend API keys are leaked into the client bundle.

---

## 4. Step-by-Step Deployment Guide

### Option A: Windows PowerShell Deployment
Run from the repository root:
```powershell
.\aws-deployment\deploy-cricket-aws.ps1 -StackName "cricket-tournament-demo" -Region "ap-south-1" -Force
```

Optional parameters:
- `-AlertEmail "admin@example.com"`: Automatically subscribes your email to CloudWatch 5xx alarms.
- `-Environment "demo"`: Sets environment tag and name prefix.
- `-Force`: Skips interactive prompt for automated CI/CD runs.

### Option B: macOS / Linux Bash Deployment
Run from the repository root:
```bash
chmod +x ./aws-deployment/deploy-cricket-aws.sh
./aws-deployment/deploy-cricket-aws.sh
```

### What the Deployment Script Automates:
1. **CLI & Environment Check**: Validates AWS CLI v2, Node.js, and npm versions.
2. **Identity Verification**: Checks STS identity and AWS Account ID.
3. **Template Validation**: Executes `aws cloudformation validate-template`.
4. **Cost & Resource Review**: Presents resource inventory and estimated costs.
5. **Quality Gates**: Runs TypeScript compilation check (`tsc --noEmit`) and the 124-test suite (`npm test`).
6. **Production Build**: Compiles optimized static assets with Vite into `dist/`.
7. **Pre-Deploy Smoke Test**: Runs `tests/smoke-test.ts` to verify build integrity and verify zero secrets are leaked.
8. **CloudFormation Provisioning**: Executes `aws cloudformation deploy` with least-privilege parameters.
9. **Asset Sync & Invalidation**: Syncs `dist/` to the private S3 bucket with `--delete` and triggers a CloudFront invalidation (`/*`).
10. **HTTPS Smoke Verification**: Queries the CloudFront HTTPS endpoint to confirm live availability (HTTP 200).

---

## 5. Database Schema & Migration Instructions

The database consists of 11 relational tables managed under PostgreSQL with Row-Level Security.

### Migration Files Overview
Located in `backend_schema/`:
- `1.sql`: Core cricket schema (`profiles`, `tournaments`, `teams`, `players`, `matches`, `playing_xi`, `innings`, `ball_events`, `player_stats`, `handle_new_user` trigger).
- `2.sql`: Resilient `handle_new_user` trigger that prevents signup failures on edge cases.
- `3.sql`: `career_applications` table with RLS and public insert policy.
- `4.sql`: Table tennis schema (`tt_players`, `tt_matches`, `tt_match_players`, `tt_games`, `tt_score_events`, realtime publications).
- `5.sql`: `tt_tournaments` table, foreign keys, and realtime publication.

### Applying Migrations
To apply migrations to your Supabase PostgreSQL instance:
1. Open the **Supabase Dashboard** -> **SQL Editor**.
2. Run `1.sql` through `5.sql` sequentially.
3. Alternatively, using `psql` with your direct connection string:
   ```bash
   psql "$VITE_POSTGRESQL_URL" -f backend_schema/1.sql
   psql "$VITE_POSTGRESQL_URL" -f backend_schema/2.sql
   psql "$VITE_POSTGRESQL_URL" -f backend_schema/3.sql
   psql "$VITE_POSTGRESQL_URL" -f backend_schema/4.sql
   psql "$VITE_POSTGRESQL_URL" -f backend_schema/5.sql
   ```

### Backup and Restore
- **Backup**:
  ```bash
  pg_dump "$VITE_POSTGRESQL_URL" --schema=public --clean --if-exists > backup_cricket_$(date +%Y%m%d).sql
  ```
- **Restore**:
  ```bash
  psql "$VITE_POSTGRESQL_URL" < backup_cricket_20261027.sql
  ```

---

## 6. Cricket Application Features & Rules Verification

The application preserves all cricket-specific logic and UI requirements:

### Cricket Rules Implemented & Verified
- **Ball-by-Ball Scoring Engine**: Full 6-ball over tracker with visual markers for dots (`·`), runs (`1`, `2`, `3`), boundaries (`4`), sixes (`6`), wickets (`W`), wides (`Wd`), and no-balls (`Nb`).
- **Delivery Legality**:
  - Dots, runs off the bat, byes, and leg-byes are **legal deliveries** (advancing the over count).
  - Wides and no-balls are **illegal deliveries** (penalties added, ball must be re-bowled, over count does NOT advance).
- **Bowler Conceded Runs**:
  - Batsman runs, wide extras, and no-ball extras are credited against the bowler's figures.
  - Byes and leg-byes are fielding extras and are **NOT** charged against the bowler.
- **Strike Rotation**:
  - Automatically rotates striker and non-striker on odd runs (1, 3, or odd byes).
  - Rotates strike at the end of each completed over (6 legal balls).
  - Changes bowler and prompts for the next bowler at over completion.
- **Wickets & Dismissals**:
  - Supports bowled, caught, lbw, run out, stumped, and hit wicket.
  - Tracks fielder for catches and run outs.
  - Run outs do not increment bowler wickets.
- **Innings Progression & Auto-Finish**:
  - Detects all-out (10 wickets).
  - Detects overs completion (e.g. 20.0 overs in T20).
  - Detects target chased in the 2nd innings and automatically triggers match conclusion.
- **Undo Ball Support**:
  - Scorer can undo the last delivery, properly rolling back runs, wickets, overs, and database records.
- **Format Flexibility**:
  - T20 (20 overs), T10 (10 overs), ODI (50 overs), Test Match (session-based / unlimited), and Custom Overs (> 0).

### Running Automated Test Suites
Execute the complete test suite locally:
```bash
# Run all 124 unit tests (Cricket + Table Tennis)
npm test

# Run Cricket scoring rules unit tests only (49 tests)
npm run test:cricket

# Run Table Tennis rules unit tests only (75 tests)
npm run test:tt

# Run automated smoke test (Build bundle integrity & zero-secret scan)
npx tsx tests/smoke-test.ts
```

---

## 7. Cost Estimate & College Demonstration Budget

This architecture is specifically optimized for college project demonstrations to avoid recurring infrastructure charges.

| AWS Service | Usage Assumption | Monthly Estimated Cost |
| :--- | :--- | :--- |
| **Amazon S3** | Static website bundle (~10 MB), Access logs (< 50 MB) | **$0.00** (Free Tier: 5 GB standard storage) |
| **Amazon CloudFront** | ~10,000 requests, < 2 GB transfer out | **$0.00** (Free Tier: 1 TB data transfer out, 10M requests) |
| **Amazon CloudWatch** | 1 Alarm, 1 Dashboard (3 metrics), standard logs | **$0.00** (Free Tier: 10 alarms, 3 dashboards) |
| **Amazon SNS** | Operational alert emails (< 100 messages) | **$0.00** (Free Tier: 1,000,000 publishes) |
| **Supabase (Database/Auth)** | Managed Free Tier project | **$0.00** (Free Tier: 500 MB database, 50,000 active users) |
| **TOTAL ESTIMATE** | **Academic / Demonstration Usage** | **$0.00 / month** |

> **Cost Optimization Decisions:**
> - Avoided NAT Gateways (saves ~$32.00/month).
> - Avoided always-on Amazon RDS PostgreSQL instances (saves ~$15.00 - $30.00/month).
> - Leveraged CloudFront OAC with S3 rather than leaving S3 buckets public.
> - Attached 30-day auto-expiration on the logging S3 bucket to eliminate storage creep.

---

## 8. Safe Cleanup Guide

To delete all created AWS resources when your demonstration is complete:

### Windows PowerShell Cleanup
Run from the repository root:
```powershell
.\aws-deployment\remove-cricket-aws.ps1 -StackName "cricket-tournament-demo" -Region "ap-south-1" -Force
```

### macOS / Linux Bash Cleanup
Run from the repository root:
```bash
chmod +x ./aws-deployment/remove-cricket-aws.sh
./aws-deployment/remove-cricket-aws.sh
```

### What Cleanup Automates:
1. Authenticates active AWS STS identity.
2. Checks that the stack exists.
3. Automatically empties stack-owned S3 buckets (`AppBucket` and `LoggingBucket`), preventing CloudFormation deletion errors.
4. Calls `aws cloudformation delete-stack` and monitors deletion progress until `DELETE_COMPLETE`.
5. Performs residual checks to confirm that no orphan resources or continuing charges remain.
6. Does **NOT** alter or delete external database data in Supabase.

---

## 9. Verification & Testing Checklist

| Test Item | Type | Target / Command | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- |
| TypeScript Check | Static | `npm run typecheck` | **PASS** | 0 errors; strict typing validated. |
| Production Build | Build | `npm run build` | **PASS** | Vite output in `dist/` (868 KB JS, 170 KB CSS). |
| Pre-deploy Smoke Test | Static | `npx tsx tests/smoke-test.ts` | **PASS** | 18 checks passed; zero secrets leaked. |
| Cricket Scoring Rules | Unit | `npm run test:cricket` | **PASS** | 49 checks passed (wides, no-balls, wickets, strike, overs). |
| Table Tennis Scoring | Unit | `npm run test:tt` | **PASS** | 75 checks passed (11/21 pts, deuce, service rotations). |
| CloudFormation Syntax | Template | `aws cloudformation validate-template` | **PASS** | Validated via AWS STS user `assignment2`. |
| S3 Bucket Security | Infrastructure | CloudFormation configuration | **PASS** | `BlockPublicAcls: true`, `BucketOwnerEnforced`, TLS-only. |
| CloudFront OAC Integration | Security | CloudFormation template | **PASS** | `AWS::CloudFront::OriginAccessControl` with SigV4 signing. |
| Live HTTPS Endpoint | Integration | Public CloudFront distribution | *Ready for deploy* | Run `deploy-cricket-aws.ps1` to provision live AWS instance. |
