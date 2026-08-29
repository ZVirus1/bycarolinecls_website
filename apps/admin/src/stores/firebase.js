import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

// Config comes from .env.local (see .env.example). Vite inlines VITE_* values
// into the bundle at build time, so these are PUBLIC by design - that is fine
// and expected for Firebase web apps. The API key identifies the project; it
// does not grant access. Real protection lives in firestore.rules, which
// require an authenticated allowlisted user for every read and write.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Fail loudly at startup rather than silently 400-ing on every request, which
// is how the previous placeholder config went unnoticed.
const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k)
if (missing.length) {
  throw new Error(
    `Firebase config incomplete - missing: ${missing.join(', ')}. ` +
      `Copy .env.example to .env.local and fill in the values from the Firebase console.`,
  )
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)
const auth = getAuth(app)

// Re-exported here so existing views keep their import paths.
export { SERVICES, PREDEFINED_SERVICES, publicServices } from '@bycarolinecls/shared/services'
export { rupiah, dmy, longDate, escapeHtml } from '@bycarolinecls/shared/format'

export {
  db,
  storage,
  auth,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  orderBy,
  query,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
}
