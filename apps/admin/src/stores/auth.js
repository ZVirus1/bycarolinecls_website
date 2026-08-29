import { ref as vueRef, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { auth } from './firebase.js'

const user = vueRef(null)
// Distinguishes "not logged in" from "we don't know yet", so the login screen
// doesn't flash on every reload while Firebase restores the session.
const authReady = vueRef(false)

onAuthStateChanged(auth, (u) => {
  user.value = u
  authReady.value = true
})

export const currentUser = computed(() => user.value)
export const isAuthenticated = computed(() => !!user.value)
export const isAuthReady = computed(() => authReady.value)

export async function signIn(email, password) {
  await setPersistence(auth, browserLocalPersistence)
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export function signOut() {
  return fbSignOut(auth)
}

// Firebase error codes are not presentable; map the ones a real user can hit.
export function friendlyAuthError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look right.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'Network problem - check your connection.'
    default:
      return 'Could not sign in. Please try again.'
  }
}
