[23:10:31.552] Running build in Washington, D.C., USA (East) – iad1
[23:10:31.553] Build machine configuration: 4 cores, 8 GB
[23:10:31.571] Cloning github.com/lakshay321123/medx (Branch: main, Commit: 616ab89)
[23:10:31.810] Cloning completed: 237.000ms
[23:10:33.755] Restored build cache from previous deployment (HmTkVxnNBDxc1CUQgWpKggrmaj8P)
[23:10:34.312] Running "vercel build"
[23:10:34.738] Vercel CLI 46.1.0
[23:10:35.067] Installing dependencies...
[23:10:36.543] 
[23:10:36.543] up to date in 1s
[23:10:36.543] 
[23:10:36.544] 144 packages are looking for funding
[23:10:36.544]   run `npm fund` for details
[23:10:36.579] Detected Next.js version: 14.2.4
[23:10:36.584] Running "npm run build"
[23:10:36.713] 
[23:10:36.713] > medx@3.0.0 build
[23:10:36.713] > next build
[23:10:36.713] 
[23:10:37.455]   ▲ Next.js 14.2.4
[23:10:37.456] 
[23:10:37.527]    Creating an optimized production build ...
[23:10:40.266] Failed to compile.
[23:10:40.267] 
[23:10:40.267] ./lib/pdftext.ts
[23:10:40.267] Module not found: Can't resolve 'pdfjs-dist/legacy/build/pdf.js'
[23:10:40.268] 
[23:10:40.268] https://nextjs.org/docs/messages/module-not-found
[23:10:40.268] 
[23:10:40.269] Import trace for requested module:
[23:10:40.269] ./app/api/analyze-doc/route.ts
[23:10:40.269] 
[23:10:40.291] 
[23:10:40.301] > Build failed because of webpack errors
[23:10:40.335] Error: Command "npm run build" exited with 1
