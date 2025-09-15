# Prop Firm Daily Anchor Cron Job Setup

## Overview
This document provides instructions for setting up automated daily anchor creation for the prop firm account tracking system.

## Cron Job Configuration

### 1. Environment Variables
Ensure the following environment variable is set:
```
CRON_SECRET=your-secure-random-secret-key
```

### 2. Cron Job Command
Set up a cron job to run daily at midnight UTC:

```bash
# Daily at 00:00 UTC - Create daily anchors for all prop firm accounts
0 0 * * * curl -X GET "https://your-domain.com/api/cron/daily-anchors" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  >> /var/log/prop-firm-cron.log 2>&1
```

### 3. Alternative: Multiple Timezone-Specific Jobs
For better timezone handling, you can set up multiple cron jobs:

```bash
# 00:00 UTC (for UTC timezone accounts)
0 0 * * * curl -X GET "https://your-domain.com/api/cron/daily-anchors" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/prop-firm-cron.log 2>&1

# 08:00 UTC (for New York timezone accounts - EST/EDT)
0 8 * * * curl -X GET "https://your-domain.com/api/cron/daily-anchors" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/prop-firm-cron.log 2>&1

# 16:00 UTC (for London timezone accounts - GMT/BST)  
0 16 * * * curl -X GET "https://your-domain.com/api/cron/daily-anchors" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/prop-firm-cron.log 2>&1
```

### 4. Cloud Platform Specific Instructions

#### Vercel (Recommended)
1. Add the `CRON_SECRET` environment variable in your Vercel dashboard
2. Create a Vercel cron job configuration in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-anchors",
      "schedule": "0 0 * * *"
    }
  ]
}
```

3. The Vercel platform will automatically call the endpoint with proper authorization

#### Railway
1. Add the `CRON_SECRET` environment variable
2. Use Railway's cron service or external cron service like cron-job.org

#### Traditional Server
Use the cron commands listed above in your server's crontab

### 5. Testing the Cron Job

#### Manual Test
```bash
curl -X POST "https://your-domain.com/api/cron/daily-anchors" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"forceDate": "2024-01-15"}'
```

#### Check Logs
The system logs all cron job executions. Check your application logs for:
- `[CronJob] Starting automated daily anchor creation`
- `[CronJob] Automated daily anchor creation completed`

### 6. Monitoring and Alerting

#### Log Monitoring
Monitor the cron job execution by checking for:
- Success/failure status
- Number of anchors created
- Execution time
- Any error messages

#### Health Check Endpoint
You can create a health check endpoint to verify the last successful cron run:

```bash
curl -X GET "https://your-domain.com/api/prop-firm/daily-anchors?date=2024-01-15"
```

## How It Works

1. **Timezone Awareness**: The system groups accounts by timezone and creates anchors for each timezone group
2. **Duplicate Prevention**: Uses `skipDuplicates: true` to prevent creating duplicate anchors
3. **Automatic Fallback**: If an anchor is missing during evaluation, it creates one immediately
4. **Error Handling**: Continues processing other timezones even if one fails

## Troubleshooting

### Common Issues
1. **No anchors created**: Check that accounts have `propfirm` field set and are not in 'failed' status
2. **Timezone errors**: Verify timezone format is valid (e.g., 'America/New_York', 'Europe/London')
3. **Authentication failures**: Ensure `CRON_SECRET` matches between cron job and environment variables

### Emergency Manual Creation
If the cron job fails, you can manually create anchors for specific users:

```bash
curl -X POST "https://your-domain.com/api/prop-firm/daily-anchors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN"
```

## Security Notes

1. Keep the `CRON_SECRET` secure and rotate it regularly
2. Monitor cron job logs for unauthorized access attempts
3. Consider IP whitelisting for additional security
4. Use HTTPS for all cron job requests
