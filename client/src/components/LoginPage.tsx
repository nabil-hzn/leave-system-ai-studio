import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../utils/firebase";
import { useAppStore } from "../state";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const response = await fetch("/api/users/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to synchronize user account with server.";
        if (response.status === 403) {
          errorMsg = "You don't have access, please contact to the admin";
        } else {
          try {
            const errorData = await response.json();
            if (errorData?.error) {
              errorMsg = errorData.error;
            }
          } catch (_) {}
        }
        try {
          await auth.signOut();
        } catch (signOutErr) {
          console.error("Error signing out after sync failure:", signOutErr);
        }
        throw new Error(errorMsg);
      }

      const syncedUser = await response.json();
      setCurrentUser(syncedUser);
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message;
      if (err.code === "auth/popup-blocked") {
        friendlyMessage = "The sign-in popup was blocked by your browser. Please allow popups for this site, or open the application in a new tab (using the button in the top-right corner of the preview pane) to complete Google Sign-In.";
      } else if (err.code === "auth/popup-closed-by-user") {
        friendlyMessage = "The sign-in popup was closed before completion. If you are experiencing third-party cookie restrictions or blockages inside the iframe preview, please open the application in a new tab (top-right corner of the preview pane) to log in securely.";
      } else if (err.code === "auth/operation-not-allowed") {
        friendlyMessage = "Google Sign-In is not enabled in your Firebase Project yet. Please ask your administrator to enable Google sign-in under 'Authentication' > 'Sign-in method' in the Firebase Console.";
      }
      setError(friendlyMessage || "Failed to sign in with Google. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">📆</span>
          <h1>Leave Calendar</h1>
          <p className="login-subtitle">Team Leave Management Portal</p>
        </div>

        <div className="login-body">
          <p className="login-prompt">
            Welcome! Please sign in using your Google Corporate Account (<strong>@pontiacland.com</strong>) to access the Leave Calendar.
          </p>

          {error && <div className="form-error-banner" style={{ marginBottom: "20px" }}>{error}</div>}

          <button
            id="google-signin-button"
            type="button"
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-inline">
                <svg className="animate-spin" viewBox="0 0 24 24" width="20" height="20" style={{ fill: "none", stroke: "currentColor", strokeWidth: 4 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                  <path d="M4 12a8 8 0 018-8" style={{ opacity: 0.75 }} />
                </svg>
                Connecting...
              </span>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>

        <div className="login-footer">
          <p className="security-note">
            🔒 Secure authentication powered by Firebase Auth.
          </p>
        </div>
      </div>
    </div>
  );
}
