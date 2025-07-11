# Brevo Email Integration Guide

## Overview

Brevo (formerly Sendinblue) provides a modern API-based email service that's perfect for the Pipedriven system. This guide covers the integration setup, implementation, and best practices.

---

## Setup & Configuration

### 1. Brevo Account Setup

1. **Create Brevo Account**
   - Sign up at [brevo.com](https://brevo.com)
   - Verify your email address
   - Set up your sender domain

2. **Get API Key**
   - Go to Settings → API Keys
   - Create a new API key with appropriate permissions
   - Copy the API key for use in environment variables

3. **Configure Sender**
   - Add and verify your sender email address
   - Set up SPF/DKIM records for better deliverability

### 2. Environment Configuration

```env
# Brevo Configuration
BREVO_API_KEY="your-brevo-api-key"
BREVO_FROM_EMAIL="noreply@yourdomain.com"
BREVO_FROM_NAME="Pipedriven System"
```

---

## Implementation

### 1. Install Dependencies

```bash
npm install @getbrevo/brevo
```

### 2. Brevo Service Implementation

```typescript
// lib/brevo.ts
import * as SibApiV3Sdk from '@getbrevo/brevo'

class BrevoService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi

  constructor() {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not configured')
    }

    const configuration = new SibApiV3Sdk.Configuration({
      apiKey: apiKey,
    })

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi(configuration)
  }

  async sendEmail(params: {
    to: string
    subject: string
    htmlContent: string
    textContent?: string
    templateId?: number
    templateData?: Record<string, any>
  }) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    sendSmtpEmail.to = [{ email: params.to }]
    sendSmtpEmail.subject = params.subject
    sendSmtpEmail.htmlContent = params.htmlContent
    sendSmtpEmail.textContent = params.textContent
    sendSmtpEmail.sender = {
      email: process.env.BREVO_FROM_EMAIL!,
      name: process.env.BREVO_FROM_NAME!
    }

    if (params.templateId) {
      sendSmtpEmail.templateId = params.templateId
      sendSmtpEmail.params = params.templateData
    }

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail)
      return result
    } catch (error) {
      console.error('Brevo email error:', error)
      throw new Error('Failed to send email')
    }
  }

  async sendTemplateEmail(params: {
    to: string
    templateId: number
    templateData: Record<string, any>
  }) {
    return this.sendEmail({
      to: params.to,
      subject: '', // Subject is handled by template
      htmlContent: '', // Content is handled by template
      templateId: params.templateId,
      templateData: params.templateData
    })
  }
}

export const brevoService = new BrevoService()
```

### 3. Email Templates

#### Activity Reminder Template

```typescript
// lib/email-templates/activity-reminder.ts
export const activityReminderTemplate = {
  templateId: 1, // Your Brevo template ID
  getData: (data: {
    userName: string
    contactName: string
    activityType: string
    dueDate: string
    campaignName?: string
  }) => ({
    USER_NAME: data.userName,
    CONTACT_NAME: data.contactName,
    ACTIVITY_TYPE: data.activityType,
    DUE_DATE: data.dueDate,
    CAMPAIGN_NAME: data.campaignName || 'No Campaign',
    LOGIN_URL: `${process.env.NEXTAUTH_URL}/activities`
  })
}
```

#### Sync Failure Notification

```typescript
// lib/email-templates/sync-failure.ts
export const syncFailureTemplate = {
  templateId: 2, // Your Brevo template ID
  getData: (data: {
    userName: string
    contactName: string
    errorMessage: string
    syncType: 'warm' | 'meeting'
  }) => ({
    USER_NAME: data.userName,
    CONTACT_NAME: data.contactName,
    ERROR_MESSAGE: data.errorMessage,
    SYNC_TYPE: data.syncType,
    RETRY_URL: `${process.env.NEXTAUTH_URL}/contacts/${data.contactId}`
  })
}
```

#### User Onboarding

```typescript
// lib/email-templates/user-onboarding.ts
export const userOnboardingTemplate = {
  templateId: 3, // Your Brevo template ID
  getData: (data: {
    userName: string
    setupUrl: string
  }) => ({
    USER_NAME: data.userName,
    SETUP_URL: data.setupUrl,
    SUPPORT_EMAIL: 'support@yourdomain.com'
  })
}
```

### 4. Email Service Integration

```typescript
// server/email/email-service.ts
import { brevoService } from '@/lib/brevo'
import { activityReminderTemplate } from '@/lib/email-templates/activity-reminder'
import { syncFailureTemplate } from '@/lib/email-templates/sync-failure'
import { userOnboardingTemplate } from '@/lib/email-templates/user-onboarding'

export class EmailService {
  async sendActivityReminder(userEmail: string, userData: any) {
    try {
      await brevoService.sendTemplateEmail({
        to: userEmail,
        templateId: activityReminderTemplate.templateId,
        templateData: activityReminderTemplate.getData(userData)
      })
      
      console.log(`Activity reminder sent to ${userEmail}`)
    } catch (error) {
      console.error('Failed to send activity reminder:', error)
      throw error
    }
  }

  async sendSyncFailureNotification(userEmail: string, syncData: any) {
    try {
      await brevoService.sendTemplateEmail({
        to: userEmail,
        templateId: syncFailureTemplate.templateId,
        templateData: syncFailureTemplate.getData(syncData)
      })
      
      console.log(`Sync failure notification sent to ${userEmail}`)
    } catch (error) {
      console.error('Failed to send sync failure notification:', error)
      throw error
    }
  }

  async sendUserOnboarding(userEmail: string, userData: any) {
    try {
      await brevoService.sendTemplateEmail({
        to: userEmail,
        templateId: userOnboardingTemplate.templateId,
        templateData: userOnboardingTemplate.getData(userData)
      })
      
      console.log(`Onboarding email sent to ${userEmail}`)
    } catch (error) {
      console.error('Failed to send onboarding email:', error)
      throw error
    }
  }

  async sendCustomEmail(params: {
    to: string
    subject: string
    htmlContent: string
    textContent?: string
  }) {
    try {
      await brevoService.sendEmail(params)
      console.log(`Custom email sent to ${params.to}`)
    } catch (error) {
      console.error('Failed to send custom email:', error)
      throw error
    }
  }
}

export const emailService = new EmailService()
```

### 5. API Route for Email Testing

```typescript
// app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/server/email/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email, type, data } = await request.json()

    switch (type) {
      case 'activity-reminder':
        await emailService.sendActivityReminder(email, data)
        break
      case 'sync-failure':
        await emailService.sendSyncFailureNotification(email, data)
        break
      case 'onboarding':
        await emailService.sendUserOnboarding(email, data)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
```

---

## Brevo Template Setup

### 1. Create Email Templates in Brevo

1. **Activity Reminder Template**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Activity Reminder</title>
   </head>
   <body>
     <h2>Hello {{params.USER_NAME}},</h2>
     <p>You have a scheduled activity with {{params.CONTACT_NAME}}.</p>
     <ul>
       <li><strong>Activity Type:</strong> {{params.ACTIVITY_TYPE}}</li>
       <li><strong>Due Date:</strong> {{params.DUE_DATE}}</li>
       <li><strong>Campaign:</strong> {{params.CAMPAIGN_NAME}}</li>
     </ul>
     <p><a href="{{params.LOGIN_URL}}">View Activity</a></p>
   </body>
   </html>
   ```

2. **Sync Failure Template**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Sync Failure</title>
   </head>
   <body>
     <h2>Hello {{params.USER_NAME}},</h2>
     <p>The sync for {{params.CONTACT_NAME}} failed.</p>
     <ul>
       <li><strong>Sync Type:</strong> {{params.SYNC_TYPE}}</li>
       <li><strong>Error:</strong> {{params.ERROR_MESSAGE}}</li>
     </ul>
     <p><a href="{{params.RETRY_URL}}">Retry Sync</a></p>
   </body>
   </html>
   ```

### 2. Template Variables

Brevo templates use `{{params.VARIABLE_NAME}}` syntax for dynamic content. Common variables:

- `{{params.USER_NAME}}` - User's name
- `{{params.CONTACT_NAME}}` - Contact's name
- `{{params.ACTIVITY_TYPE}}` - Type of activity
- `{{params.DUE_DATE}}` - Activity due date
- `{{params.CAMPAIGN_NAME}}` - Campaign name
- `{{params.ERROR_MESSAGE}}` - Error details
- `{{params.LOGIN_URL}}` - Application URL

---

## Usage Examples

### 1. Send Activity Reminder

```typescript
// In your activity service
import { emailService } from '@/server/email/email-service'

// When creating an activity with due date
await emailService.sendActivityReminder(user.email, {
  userName: user.name,
  contactName: contact.name,
  activityType: 'Call',
  dueDate: '2024-01-15 14:00',
  campaignName: 'Q1 Outreach'
})
```

### 2. Send Sync Failure Notification

```typescript
// In your Pipedrive sync service
import { emailService } from '@/server/email/email-service'

// When sync fails
await emailService.sendSyncFailureNotification(user.email, {
  userName: user.name,
  contactName: contact.name,
  errorMessage: 'API rate limit exceeded',
  syncType: 'warm'
})
```

### 3. Send User Onboarding

```typescript
// When user registers
import { emailService } from '@/server/email/email-service'

await emailService.sendUserOnboarding(user.email, {
  userName: user.name,
  setupUrl: `${process.env.NEXTAUTH_URL}/setup`
})
```

---

## Best Practices

### 1. Rate Limiting
- Brevo free tier: 300 emails/day
- Monitor usage to avoid hitting limits
- Implement queuing for high-volume scenarios

### 2. Error Handling
- Always wrap email sending in try-catch blocks
- Log errors for debugging
- Implement retry logic for transient failures

### 3. Template Management
- Use Brevo's template editor for complex emails
- Keep templates simple and mobile-friendly
- Test templates across different email clients

### 4. Monitoring
- Track email delivery rates
- Monitor bounce rates
- Set up alerts for high failure rates

### 5. Security
- Never expose API keys in client-side code
- Use environment variables for configuration
- Implement proper authentication for email endpoints

---

## Testing

### 1. Local Testing
```typescript
// Test email sending locally
const testData = {
  userName: 'John Doe',
  contactName: 'Jane Smith',
  activityType: 'Call',
  dueDate: '2024-01-15 14:00',
  campaignName: 'Test Campaign'
}

await emailService.sendActivityReminder('test@example.com', testData)
```

### 2. Template Testing
- Use Brevo's template testing feature
- Test with different data scenarios
- Verify mobile responsiveness

### 3. Integration Testing
- Test email sending in your test environment
- Verify template variables are populated correctly
- Test error handling scenarios

---

## Migration from SMTP

If migrating from an existing SMTP setup:

1. **Update environment variables**
2. **Replace Nodemailer with Brevo SDK**
3. **Convert email templates to Brevo format**
4. **Update email service calls**
5. **Test thoroughly before deploying**

This Brevo integration provides a more reliable, scalable, and feature-rich email solution compared to traditional SMTP. 