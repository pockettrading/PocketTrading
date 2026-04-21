import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxbQCmKXpn1WYBlfOvtUlV51Qeb6GNHVg",
  authDomain: "pockettrading-75755.firebaseapp.com",
  projectId: "pockettrading-75755",
  storageBucket: "pockettrading-75755.firebasestorage.app",
  messagingSenderId: "351795883193",
  appId: "1:351795883193:web:231d4f74537396f7d9bf68"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
