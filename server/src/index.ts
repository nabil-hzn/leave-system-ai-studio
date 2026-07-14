import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { usersRouter } from "./routes/users.js";
import { leavesRouter } from "./routes/leaves.js";
import { authRouter } from "./routes/auth.js";
import "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/leaves", leavesRouter);
app.use("/api/auth", authRouter);

app.get(["/auth/callback", "/auth/callback/"], (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Authentication Success</title>
    </head>
    <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f3f4f6;">
      <div style="text-align: center; padding: 2.5rem; border-radius: 1rem; background: white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); max-width: 400px; width: 100%; box-sizing: border-box;">
        <div style="width: 48px; height: 48px; background-color: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; font-size: 1.5rem;">🔑</div>
        <h3 style="color: #111827; margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600;">Completing Sign In</h3>
        <p style="color: #4b5563; font-size: 0.875rem; margin: 0 0 1.5rem 0; line-height: 1.5;">Setting up your Pontiac Land Leave Portal session...</p>
        <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #0284c7; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
        <script>
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const oauthError = urlParams.get('error') || urlParams.get('error_description');
            if (oauthError) {
              document.querySelector('h3').innerText = 'OAuth Error';
              document.querySelector('p').innerText = oauthError + '. Please check Google Console settings.';
              document.querySelector('div').style.display = 'none';
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_SSO_ERROR', error: oauthError }, '*');
                setTimeout(() => window.close(), 3000);
              }
            } else {
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash);
              const idToken = params.get('id_token');
              if (idToken) {
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_SSO_SUCCESS', credential: idToken }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  document.querySelector('h3').innerText = 'Sign In Successful';
                  document.querySelector('p').innerText = 'You may close this window and return to the leave portal.';
                  document.querySelector('div').style.display = 'none';
                }
              } else {
                document.querySelector('h3').innerText = 'Sign In Error';
                document.querySelector('p').innerText = 'No credentials found. Ensure "Implicit Grant -> ID Tokens" is enabled in Google Cloud Console.';
                document.querySelector('div').style.display = 'none';
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_SSO_ERROR', error: 'Implicit Flow ID Token missing from Google response.' }, '*');
                }
              }
            }
          } catch (err) {
            console.error('Error handling oauth callback:', err);
            document.querySelector('h3').innerText = 'Authentication Failed';
            document.querySelector('p').innerText = err.message || 'An unexpected error occurred.';
            document.querySelector('div').style.display = 'none';
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_SSO_ERROR', error: err.message || 'Authentication failed' }, '*');
            }
          }
        </script>
      </div>
    </body>
    </html>
  `);
});

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Leave system API listening on http://localhost:${PORT}`);
});
