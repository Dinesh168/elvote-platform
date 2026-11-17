import { getApp, getApps, initializeApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDnFDpddkSTreggvLr069ueAwGmqkYHg6M",
  authDomain: "elvote-aeb0e.firebaseapp.com",
  projectId: "elvote-aeb0e",
  storageBucket: "elvote-aeb0e.appspot.com",
  messagingSenderId: "591011962489",
  appId: "1:591011962489:web:d14c5fcdcf8c6f3bd1bea8",
  measurementId: "G-519KW1V3VL"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export default app;
