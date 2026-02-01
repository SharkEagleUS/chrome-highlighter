˚# Email Confirmation Setup Guide

This guide explains how to configure Supabase email confirmation to display a success message instead of redirecting to localhost.

## Problem

By default, Supabase email confirmation links redirect to `localhost`, which doesn't work properly for Chrome extensions or when users confirm their email from a different device.

## Solution

Configure Supabase to show a built-in confirmation success page instead of redirecting to localhost.

## Configuration Steps

### 1. Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **chrome-extension** (ID: `yttpypsszygaelvdbbiu`)

### 2. Configure Site URL

1. Navigate to **Authentication** → **URL Configuration**
2. Set the **Site URL** to: `https://yttpypsszygaelvdbbiu.supabase.co`
   - This is your Supabase project URL
   - This ensures the confirmation link redirects to Supabase's domain instead of localhost

### 3. Configure Redirect URLs (Optional)

If you want to add additional allowed redirect URLs:

1. In the same **URL Configuration** page
2. Under **Redirect URLs**, add any additional URLs you want to allow
3. For a Chrome extension, you can leave this empty or add your extension's URL

### 4. Update Email Templates (Optional)

To customize the confirmation message:

1. Navigate to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. The default template will now redirect to the Site URL you configured
4. You can customize the message shown after confirmation

### 5. Alternative: Disable Email Confirmation (For Testing Only)

If you want to disable email confirmation entirely for testing:

1. Navigate to **Authentication** → **Providers** → **Email**
2. Uncheck **Enable email confirmations**
3. **Warning**: This is not recommended for production as it allows anyone to sign up without verifying their email

## How It Works

With the updated configuration:

1. User signs up in the Chrome extension
2. Supabase sends a confirmation email
3. User clicks the confirmation link in the email
4. Instead of redirecting to `localhost`, the link goes to `https://yttpypsszygaelvdbbiu.supabase.co/auth/v1/verify`
5. Supabase displays a built-in success page: **"Email confirmed. You can now close this window."**
6. User can return to the extension and sign in

## Code Changes

The `auth.ts` service has been updated to include the `emailRedirectTo` option:

```typescript
await supabase.auth.signUp({
  email: credentials.email,
  password: credentials.password,
  options: {
    emailRedirectTo: 'https://yttpypsszygaelvdbbiu.supabase.co/auth/v1/verify'
  }
});
```

This ensures the confirmation link uses the correct redirect URL.

## Testing

1. Build and reload the extension: `npm run build`
2. Open the extension side panel
3. Go to the **Account** tab
4. Sign up with a new email address
5. Check your email for the confirmation link
6. Click the confirmation link
7. You should see a Supabase success page instead of a localhost error
8. Return to the extension and sign in

## Troubleshooting

**Issue**: Still redirecting to localhost
- **Solution**: Make sure you've updated the Site URL in the Supabase dashboard and rebuilt the extension

**Issue**: "Invalid redirect URL" error
- **Solution**: Verify that the Site URL matches your Supabase project URL exactly

**Issue**: Not receiving confirmation emails
- **Solution**: Check your spam folder, or disable email confirmation for testing (see step 5 above)
