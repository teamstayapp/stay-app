import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getFirebaseDb } from './firebase'

const key = (userId: string) => `stay.profile.${userId}`

function cleanChatName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 32) : ''
}

function localChatName(userId: string): string {
  try {
    return cleanChatName(localStorage.getItem(key(userId)))
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
        localStorage.setItem(key(userId), remote)
        callback(remote)
      }
    },
    () => undefined,
  )
}

export async function saveChatName(userId: string, value: string): Promise<void> {
  const chatName = cleanChatName(value)
  localStorage.setItem(key(userId), chatName)
  const db = getFirebaseDb()
  if (!db) return
  await setDoc(doc(db, 'userProfiles', userId), { chatName }, { merge: true })
}
