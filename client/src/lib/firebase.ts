import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaxfX3sXlOsDAPPzvGUcsfeLrYDpJeYKY",
  authDomain: "protimer-aceed.firebaseapp.com",
  projectId: "protimer-aceed",
  storageBucket: "protimer-aceed.appspot.com",
  messagingSenderId: "578871094044",
  appId: "1:578871094044:web:0df5ea35d23910300868d9",
  measurementId: "G-YKMSL8R5LD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics - only in browser environments
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;