# Vercel Deployment Troubleshooting Checklist

## Before Deploying

- [ ] Local build works: `npm run vercel-build`
- [ ] Build output exists: `client/build/index.html`
- [ ] No build errors in console
- [ ] Git repository is clean (no uncommitted changes)
- [ ] Latest changes are committed to main branch

## Vercel Configuration

- [ ] Project is connected to GitHub repository
- [ ] Build settings point to correct root directory (.)
- [ ] Output directory is set to: `client/build`
- [ ] Build command is: `cd client && npm install && npm run build`
- [ ] vercel.json exists and is valid JSON

## Environment Variables

In Vercel Project Settings → Environment Variables, add these for production:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyBYG7mANiuKWSHvZKOTuR-Jjgx0ZwTgcvE
REACT_APP_FIREBASE_AUTH_DOMAIN=fhapp-ca321.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=fhapp-ca321
REACT_APP_FIREBASE_STORAGE_BUCKET=fhapp-ca321.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=321828975722
REACT_APP_FIREBASE_APP_ID=1:321828975722:web:b1c8e8ab6462f74eb8c613
REACT_APP_FIREBASE_MEASUREMENT_ID=G-C13GEDVMBF
```

## Common Deployment Errors & Solutions

### Error: "No Output Directory named 'build' found"
**Cause**: Vercel can't locate the build output
**Solution**:
1. Verify `outputDirectory` in vercel.json is `client/build`
2. Test local build: `npm run vercel-build`
3. Check that `client/build/index.html` exists

### Error: "Build failed"
**Solution**: Check Vercel build logs
1. Go to Vercel Dashboard → Your Project
2. Click on the failed deployment
3. Scroll to see full build output
4. Look for specific error messages

### Error: "Module not found" during build
**Solution**:
1. Clear node_modules locally: `rm -rf node_modules client/node_modules`
2. Reinstall: `npm install && cd client && npm install`
3. Test build: `npm run vercel-build`
4. Commit and redeploy

### Error: "Firebase not configured" in production
**Solution**:
1. Verify environment variables are set in Vercel
2. Check that variables start with `REACT_APP_`
3. Redeploy after setting variables

### Error: "Profile pictures not uploading"
**Solution**:
1. Verify Firebase Storage is enabled
2. Check Storage security rules allow uploads
3. Verify environment variables include Firebase Storage bucket
4. Check browser console for specific errors

## Deployment Verification

After successful deployment:

- [ ] Frontend loads without 404 errors
- [ ] Navigation works (all routes accessible)
- [ ] Chat page loads
- [ ] Profile page accessible
- [ ] Can login/register (if not authenticated)
- [ ] Profile picture upload works
- [ ] Images display in chat
- [ ] No console errors in DevTools

## Quick Redeploy

If deployment still fails:

1. **Push to main branch**: Any push triggers automatic redeploy
   ```bash
   git push origin main
   ```

2. **Manual redeploy in Vercel**:
   - Dashboard → Project → Deployments
   - Click "..." on latest deployment
   - Select "Redeploy"

3. **Clear Vercel cache** (nuclear option):
   - Settings → Git
   - Disconnect and reconnect repository
   - Redeploy

## Debugging Tips

1. **Test locally first**:
   ```bash
   npm run vercel-build
   cd client/build
   npx serve -s .
   ```
   Then visit http://localhost:3000

2. **Check file sizes** - Look for unusually large files:
   ```bash
   ls -lh client/build/static/js/
   ```

3. **Monitor Vercel Analytics**:
   - Check performance metrics
   - Look for 404 errors
   - Verify environment variables are being used

## Need More Help?

- Vercel Docs: https://vercel.com/docs
- Check Vercel Status: https://www.vercel-status.com
- GitHub Issues: Check for similar problems in repo

## File Structure Verification

Your project should have this structure for deployment:

```
fhapp/
├── vercel.json              ← Tells Vercel how to build
├── .vercelignore            ← Excludes unnecessary files
├── package.json             ← Root package.json with vercel-build script
├── client/
│   ├── package.json
│   ├── public/
│   ├── src/
│   └── build/               ← Created after build (not in git)
└── server/                  ← Not deployed with this config
```

## Current Configuration

**vercel.json**:
- buildCommand: `cd client && npm install && npm run build`
- outputDirectory: `client/build`
- routes: Configured for SPA (all routes to index.html)

This configuration tells Vercel:
1. Go to client directory
2. Install dependencies
3. Build React app
4. Serve the build folder
5. Route all requests to index.html for React Router
