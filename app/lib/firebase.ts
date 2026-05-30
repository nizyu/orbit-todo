import { getAI } from "firebase/ai";
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "localhost",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
	storageBucket:
		import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
	appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

// 同じFirebaseアプリが複数回初期化されるのを防ぐ
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const ai = getAI(app);

// Firebase Emulator Suite (ローカル開発用)
if (
	typeof window !== "undefined" &&
	import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"
) {
	connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
	connectFirestoreEmulator(db, "localhost", 8080);
}
