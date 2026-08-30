import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getFirebaseDb } from './firebase'

const chatNameKey = (userId: string) => `stay.profile.${userId}`
const partnerNameKey = (userId: string) => `stay.partner-name.${userId}`

function cleanChatName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 32) : ''
}

function localChatName(userId: string): string {
  try {
    return cleanChatName(localStorage.getItem(chatNameKey(userId)))
  } catch {
    return ''
  }
}

function localPartnerName(userId: string): string {
  try {
    return cleanChatName(localStorage.getItem(partnerNameKey(userId)))
  } catch {
    return ''
  }
}

export function observeChatName(userId: string, callback: (chatName: string) => void): () => void {
  const local = localChatName(userId)
  if (local) callback(local)

  const db = getFirebaseDb()
  if (!db) return () => undefined
  return onSnapshot(
    doc(db, 'userProfiles', userId),
    (snapshot) => {
      const remote = cleanChatName(snapshot.data()?.chatName)
      if (remote) {
        localStorage.setItem(chatNameKey(userId), remote)
        callback(remote)
      }
    },
    () => undefined,
  )
}

export async function saveChatName(userId: string, value: string): Promise<void> {
  const chatName = cleanChatName(value)
  localStorage.setItem(chatNameKey(userId), chatName)
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(doc(db, 'userProfiles', userId), { chatName }, { merge: true })
}

export function observePartnerName(userId: string, callback: (partnerName: string) => void): () => void {
  const local = localPartnerName(userId)
  if (local) callback(local)

  const db = getFirebaseDb()
  if (!db) return () => undefined
  return onSnapshot(
    doc(db, 'userProfiles', userId),
    (snapshot) => {
      const remote = cleanChatName(snapshot.data()?.partnerName)
      if (remote) {
        localStorage.setItem(partnerNameKey(userId), remote)
        callback(remote)
      }
    },
    () => undefined,
  )
}

export async function savePartnerName(userId: string, value: string): Promise<void> {
  const partnerName = cleanChatName(value)
  localStorage.setItem(partnerNameKey(userId), partnerName)
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(doc(db, 'userProfiles', userId), { partnerName }, { merge: true })
}
