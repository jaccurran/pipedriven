# Pipedrive API Configuration

This document describes all available configuration options for the Pipedrive API integration.

## Environment Variables

All Pipedrive configuration is done through environment variables. Here are all available options:

### API Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPEDRIVE_BASE_URL` | `https://api.pipedrive.com` | Base URL for Pipedrive API |
| `PIPEDRIVE_API_VERSION` | `v1` | API version to use |
| `PIPEDRIVE_TIMEOUT` | `30000` | Request timeout in milliseconds |

### Retry Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPEDRIVE_MAX_RETRIES` | `3` | Maximum number of retries for failed requests |
| `PIPEDRIVE_RETRY_DELAY` | `1000` | Delay between retries in milliseconds |
| `PIPEDRIVE_RATE_LIMIT_DELAY` | `60000` | Rate limiting delay in milliseconds |

### Data Validation Limits

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPEDRIVE_MAX_NAME_LENGTH` | `255` | Maximum length for contact names |
| `PIPEDRIVE_MAX_EMAIL_LENGTH` | `255` | Maximum length for email addresses |
| `PIPEDRIVE_MAX_PHONE_LENGTH` | `50` | Maximum length for phone numbers |
| `PIPEDRIVE_MAX_ORG_NAME_LENGTH` | `255` | Maximum length for organization names |
| `PIPEDRIVE_MAX_SUBJECT_LENGTH` | `255` | Maximum length for activity subjects |
| `PIPEDRIVE_MAX_NOTE_LENGTH` | `1000` | Maximum length for activity notes |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPEDRIVE_ENABLE_RETRIES` | `true` | Enable retry logic for failed requests |
| `PIPEDRIVE_ENABLE_RATE_LIMITING` | `true` | Enable rate limiting handling |
| `PIPEDRIVE_ENABLE_DATA_SANITIZATION` | `true` | Enable data sanitization (XSS protection, length limits) |
| `PIPEDRIVE_ENABLE_DETAILED_LOGGING` | `true` | Enable detailed logging for debugging |

## Example Configurations

### Development Environment

```bash
# Development with verbose logging
PIPEDRIVE_ENABLE_DETAILED_LOGGING="true"
PIPEDRIVE_TIMEOUT="60000"
PIPEDRIVE_MAX_RETRIES="5"
```

### Production Environment

```bash
# Production with stricter limits
PIPEDRIVE_ENABLE_DETAILED_LOGGING="false"
PIPEDRIVE_MAX_RETRIES="2"
PIPEDRIVE_TIMEOUT="15000"
PIPEDRIVE_ENABLE_RATE_LIMITING="true"
```

### Testing Environment

```bash
# Testing with minimal overhead
PIPEDRIVE_ENABLE_RETRIES="false"
PIPEDRIVE_ENABLE_RATE_LIMITING="false"
PIPEDRIVE_ENABLE_DATA_SANITIZATION="false"
PIPEDRIVE_ENABLE_DETAILED_LOGGING="false"
```

### Custom Pipedrive Instance

```bash
# For custom Pipedrive instances
PIPEDRIVE_BASE_URL="https://your-custom-pipedrive-instance.com"
PIPEDRIVE_API_VERSION="v1"
```

## Configuration Validation

The system validates configuration on startup and will throw errors for invalid settings:

- URLs must be valid
- Timeouts must be at least 1000ms
- Retry counts must be non-negative
- Length limits must be at least 1

## Usage in Code

```typescript
import { pipedriveConfig, getPipedriveApiUrl } from '@/lib/pipedrive-config'

// Access configuration
console.log('API URL:', getPipedriveApiUrl())
console.log('Max retries:', pipedriveConfig.maxRetries)
console.log('Timeout:', pipedriveConfig.timeout)

// Check if features are enabled
if (pipedriveConfig.enableRetries) {
  // Retry logic
}

if (pipedriveConfig.enableDataSanitization) {
  // Sanitize data
}
```

## Failsafe Features

The configuration system includes several failsafe features:

1. **Default Values**: All settings have sensible defaults
2. **Validation**: Configuration is validated on startup
3. **Graceful Degradation**: Features can be disabled individually
4. **Environment Awareness**: Different settings for different environments

## Security Considerations

- API keys are never logged, even with detailed logging enabled
- Data sanitization removes HTML tags and scripts by default
- Rate limiting is enabled by default to prevent API abuse
- Timeouts prevent hanging requests

## Troubleshooting

### Common Issues

1. **Invalid URL**: Ensure `PIPEDRIVE_BASE_URL` is a valid URL
2. **Timeout Issues**: Increase `PIPEDRIVE_TIMEOUT` for slow connections
3. **Rate Limiting**: Increase `PIPEDRIVE_RATE_LIMIT_DELAY` if hitting rate limits
4. **Data Truncation**: Increase length limits if data is being cut off

### Debug Mode

Enable detailed logging to troubleshoot issues:

```bash
PIPEDRIVE_ENABLE_DETAILED_LOGGING="true"
```

This will log:
- API request details
- Response status codes
- Error messages
- Retry attempts
- Rate limiting information 