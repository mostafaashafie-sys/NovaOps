# Next Steps - Action Plan

## 🎯 What You Need to Do

### Step 1: Get Your Azure Web App's App Registration Details

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your **Azure Web App**
3. Go to **Authentication** (or **Identity**)
4. Find the **App Registration** being used
5. Click on it to open the App Registration details
6. **Copy these values:**
   - **Application (client) ID** - You'll need this!
   - **Directory (tenant) ID** - You'll need this!

### Step 2: Configure App Registration for Frontend

1. In the **App Registration** page, go to **Authentication**
2. Under **Single-page application**, click **Add a platform**
3. Add these redirect URIs:
   - `http://localhost:3000` (for local development)
   - `https://your-web-app.azurewebsites.net` (your production URL)
4. Click **Save**

### Step 3: Add Dataverse Permission

1. In the **App Registration**, go to **API permissions**
2. Click **Add a permission**
3. Select **APIs my organization uses**
4. Search for **Dynamics CRM** or **Dataverse**
5. Select **Delegated permissions**
6. Check **user_impersonation**
7. Click **Add permissions**
8. Click **Grant admin consent** (if you have admin rights)

### Step 4: Update Your `.env` File (Local Development)

Update your `.env` file with the Client ID:

```bash
# Dataverse API Base URL
VITE_DATAVERSE_URL=https://mostafashafie-uaesenvironment.crm4.dynamics.com/api/data/v9.2

# Azure AD Configuration (from your Azure Web App's App Registration)
VITE_AZURE_CLIENT_ID=paste-your-client-id-here
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/paste-your-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:3000

# Use real Dataverse (not mock data)
VITE_USE_MOCK_DATA=false
```

### Step 5: Test Locally

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** to `http://localhost:3000`

3. **Click "Sign In with Microsoft"** button (in the navigation)

4. **Sign in** with your Azure AD credentials

5. **Verify** you can access Dataverse data (no more 401 errors!)

### Step 6: Configure Production (Azure Web App)

1. Go to your **Azure Web App** → **Configuration** → **Application settings**

2. **Add these environment variables:**
   - `VITE_AZURE_CLIENT_ID` = (same Client ID from Step 1)
   - `VITE_AZURE_AUTHORITY` = `https://login.microsoftonline.com/{your-tenant-id}`
   - `VITE_DATAVERSE_URL` = `https://mostafashafie-uaesenvironment.crm4.dynamics.com/api/data/v9.2`
   - `VITE_USE_MOCK_DATA` = `false`

3. **Save** and **restart** your Web App

4. **Rebuild and deploy** your frontend (environment variables are embedded at build time)

## ✅ Quick Checklist

- [ ] Get Client ID from Azure Web App's App Registration
- [ ] Get Tenant ID from Azure Web App's App Registration
- [ ] Add redirect URIs (localhost:3000 and production URL)
- [ ] Add `user_impersonation` permission for Dataverse
- [ ] Grant admin consent for the permission
- [ ] Update `.env` file with Client ID and Tenant ID
- [ ] Test locally - sign in and verify no 401 errors
- [ ] Set environment variables in Azure Web App
- [ ] Rebuild and deploy to production

## 🚨 Common Issues

### "Redirect URI mismatch"
- Make sure the redirect URI in `.env` matches exactly what's in Azure Portal
- No trailing slashes
- Use `http://` for localhost, `https://` for production

### "No active account found"
- Make sure you clicked "Sign In with Microsoft" first
- Check browser console for errors

### Still getting 401 errors
- Verify `user_impersonation` permission is granted and has admin consent
- Check that the user has access to the Dataverse environment
- Verify the Dataverse URL is correct

## 📝 Notes

- **Same App Registration**: You're reusing your Azure Web App's App Registration - no need to create a new one!
- **Easy Auth**: If your Web App has Easy Auth enabled, the code will automatically use it in production
- **Development**: You'll use MSAL with the same App Registration for local development

## 🎉 Once Complete

After completing these steps:
- ✅ Local development will work with MSAL authentication
- ✅ Production will work with Easy Auth or MSAL
- ✅ No more 401 errors!
- ✅ Users can sign in and access Dataverse data

