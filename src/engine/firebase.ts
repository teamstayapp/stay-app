import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function firebaseReady() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  )
}

export function getFirebaseAuth() {
  if (!firebaseReady()) return null
  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
    auth = getAuth(app)
    auth.languageCode = 'da'
  }
  return auth
}

export function getFirebaseDb() {
  if (!firebaseReady()) return null
  getFirebaseAuth()
  if (!app) return null
  if (!db) db = getFirestore(app)
  return db
}
