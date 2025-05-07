=============================================
CN CLASS PROJECT - SETUP GUIDE
=============================================

GitHub Repository: https://github.com/pradeepyadav5137/CN_CLASS_PROJECT

---------------------------------------------
STEP 1: INSTALL CLOUDFLARED TUNNEL
---------------------------------------------
1. Install using Windows Package Manager:
   > winget install cloudflared

2. Verify installation:
   > cloudflared --version

---------------------------------------------
STEP 2: AUTHENTICATE (OPTIONAL)
---------------------------------------------
Run:
> cloudflared tunnel login
Follow the browser prompts. Skip this for temporary tunnels.

---------------------------------------------
STEP 3: START THE TUNNEL
---------------------------------------------
Expose your local server with:
> cloudflared tunnel --url http://localhost:3000

This will generate a secure URL like:
https://your-tunnel.trycloudflare.com

---------------------------------------------
STEP 4: UPDATE SOCKET.IO CONFIGURATION
---------------------------------------------
1. Edit `public/script.js`
2. Replace the socket.io URL with the tunnel URL:
   const socket = io("<YOUR_CLOUDFLARE_TUNNEL_URL>");

Example:
const socket = io("https://your-tunnel.trycloudflare.com");

---------------------------------------------
STEP 5: START THE SERVER
---------------------------------------------
1. Navigate to your project folder.
2. Run:
   > npm start

---------------------------------------------
STEP 6: ACCESS THE APPLICATION
---------------------------------------------
Open in your browser:
http://localhost:3000
(or 127.0.0.1:3000)

---------------------------------------------
SHARE THE SERVICE
---------------------------------------------
- Share the Cloudflare tunnel URL from Step 3.
- Users can access it directly without local setup!

---------------------------------------------
TROUBLESHOOTING
---------------------------------------------
- Port 3000 blocked? Check firewall settings.
- Tunnel errors? Re-run authentication (Step 2).
- Always restart server after config changes.

=============================================
ENJOY OUR PROJECT! 🚀
=============================================
