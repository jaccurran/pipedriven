#!/bin/bash

# Environment Variables Setup Script
# Usage: source scripts/set-env.sh [environment]

ENVIRONMENT=${1:-development}

echo "Setting environment variables for: $ENVIRONMENT"

case $ENVIRONMENT in
  "development")
    export PIPEDRIVE_BASE_URL="https://api.pipedrive.com"
    export PIPEDRIVE_API_VERSION="v1"
    export PIPEDRIVE_TIMEOUT="60000"
    export PIPEDRIVE_MAX_RETRIES="5"
    export PIPEDRIVE_RETRY_DELAY="1000"
    export PIPEDRIVE_RATE_LIMIT_DELAY="60000"
    export PIPEDRIVE_ENABLE_RETRIES="true"
    export PIPEDRIVE_ENABLE_RATE_LIMITING="true"
    export PIPEDRIVE_ENABLE_DATA_SANITIZATION="true"
    export PIPEDRIVE_ENABLE_DETAILED_LOGGING="true"
    echo "✅ Development environment variables set"
    ;;
    
  "production")
    export PIPEDRIVE_BASE_URL="https://api.pipedrive.com"
    export PIPEDRIVE_API_VERSION="v1"
    export PIPEDRIVE_TIMEOUT="15000"
    export PIPEDRIVE_MAX_RETRIES="2"
    export PIPEDRIVE_RETRY_DELAY="1000"
    export PIPEDRIVE_RATE_LIMIT_DELAY="60000"
    export PIPEDRIVE_ENABLE_RETRIES="true"
    export PIPEDRIVE_ENABLE_RATE_LIMITING="true"
    export PIPEDRIVE_ENABLE_DATA_SANITIZATION="true"
    export PIPEDRIVE_ENABLE_DETAILED_LOGGING="false"
    echo "✅ Production environment variables set"
    ;;
    
  "testing")
    export PIPEDRIVE_BASE_URL="https://api.pipedrive.com"
    export PIPEDRIVE_API_VERSION="v1"
    export PIPEDRIVE_TIMEOUT="10000"
    export PIPEDRIVE_MAX_RETRIES="0"
    export PIPEDRIVE_RETRY_DELAY="100"
    export PIPEDRIVE_RATE_LIMIT_DELAY="1000"
    export PIPEDRIVE_ENABLE_RETRIES="false"
    export PIPEDRIVE_ENABLE_RATE_LIMITING="false"
    export PIPEDRIVE_ENABLE_DATA_SANITIZATION="false"
    export PIPEDRIVE_ENABLE_DETAILED_LOGGING="false"
    echo "✅ Testing environment variables set"
    ;;
    
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "Available environments: development, production, testing"
    exit 1
    ;;
esac

echo "Environment variables set successfully!"
echo "You can now run: npm run dev" 