import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDHpZjWfgJdYQ01qFgW8GjJ1W9_F3vhXlE",
  authDomain: "twin-hill-website.firebaseapp.com",
  projectId: "twin-hill-website",
  storageBucket: "twin-hill-website.firebasestorage.app",
  messagingSenderId: "934036241917",
  appId: "1:934036241917:web:bedfb90bd53874cf012d94",
  measurementId: "G-R111TB9E7X"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);