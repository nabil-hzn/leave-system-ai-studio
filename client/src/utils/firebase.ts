import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyA8ebGoYycmxjMeEi401VMG91YMQmgshik",
  authDomain: "plg-ai-dev.firebaseapp.com",
  projectId: "plg-ai-dev",
  storageBucket: "plg-ai-dev.firebasestorage.app",
  messagingSenderId: "944229259046",
  appId: "1:944229259046:web:a5cb8f33887b05288893e7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
