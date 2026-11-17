import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDnFDpddkSTreggvLr069ueAwGmqkYHg6M",
  authDomain: "elvote-aeb0e.firebaseapp.com",
  projectId: "elvote-aeb0e",
  storageBucket: "elvote-aeb0e.appspot.com",
  messagingSenderId: "591011962489",
  appId: "1:591011962489:web:d14c5fcdcf8c6f3bd1bea8",
  measurementId: "G-519KW1V3VL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// IMPORTANT: this is the web replacement for AsyncStorage
setPersistence(auth, browserLocalPersistence);

export { auth };
export default app;
