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

// === FIREBASE CONFIGURATION ===
// Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: 'AIzaSyCJ0JQjHjHqHjHjHjHjHjHjHjHjHjHjHjHjH', // Replace with your actual API Key
  authDomain: 'bycarolinecls-2144b.firebaseapp.com',
  projectId: 'bycarolinecls-2144b',
  storageBucket: 'bycarolinecls-2144b.firebasestorage.app', // Your storage bucket
  messagingSenderId: '123456789', // Replace with your actual sender ID
  appId: '1:123456789:web:abc123def456', // Replace with your actual app ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)

// Predefined services with prices
export const PREDEFINED_SERVICES = [
  { description: 'Makeup Party / Graduation', price: 1000000 },
  { description: 'Makeup Sister / Bridesmaid', price: 1000000 },
  { description: 'Makeup Sister / Bridesmaid + Retouch', price: 1700000 },
  { description: 'Makeup Mom / Mature', price: 1200000 },
  { description: 'Makeup Mom / Mature + Retouch', price: 1800000 },
  { description: 'Makeup Wedding Half Day', price: 3800000 },
  { description: 'Makeup Wedding Full Day', price: 6000000 },
  { description: 'Makeup Engagement', price: 1800000 },
  { description: 'Makeup Prewedding', price: 1500000 },
  { description: 'Makeup Trial', price: 0 },
]

// Formatting helpers
export const rupiah = (num) =>
  !num || isNaN(num) || Number(num) === 0 ? '-' : 'Rp ' + Number(num).toLocaleString('id-ID') + ',-'

export const dmy = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}/${d.getFullYear()}`

export const longDate = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export const escapeHtml = (s) => {
  return s.replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m],
  )
}

// Export Firebase functions for use in components
export {
  db,
  storage,
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
