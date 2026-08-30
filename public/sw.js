const CACHE = 'stay-v4'
const APP_ROOT = new URL('./', self.registration.scope).href
const PUSH_CONFIG_URL = new URL('stay-push-config', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './manifest.webmanifest', './icon.svg'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const fresh = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(APP_ROOT, fresh)))
          return response
        })
        .catch(() => caches.match(APP_ROOT)),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).catch(() => caches.match(APP_ROOT))),
  )
})

const TASK_BANK = {
  lingerie: [
    'Tjek lingeriet. Sidder det som jeg vil.',
    'Trusser på. Skriv når de sidder.',
    'Strømper op. Små skridt.',
  ],
  edge: [
    'Tyve langsomme ryk. Stop.',
    'Hænderne væk i to minutter.',
    'Edge. Du kommer ikke.',
  ],
  sissy: [
    'Paryk eller læbestift hvis du har det. Vis det i chatten.',
    'Trusserne bliver på. Pikken indenunder.',
    'Gå som jeg har sagt. Små skridt.',
  ],
  protocol: [
    'Knæ. Sig titlen. Vent.',
    'Hænderne i skødet. Ingen pik før jeg siger det.',
    'Titulér din partner i næste besked.',
  ],
  worship: [
    'Tænk på mine fødder. Skriv det.',
    'Kys luften. Du skylder en vrist senere.',
    'Tilbed. Kort. Ingen hænder på dig selv endnu.',
  ],
}
TASK_BANK.mix = Object.values(TASK_BANK).flat()

self.addEventListener('push', (event) => {
  event.waitUntil(showStayPush())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.registration.scope))
      if (existing) return existing.focus()
      return self.clients.openWindow(APP_ROOT)
    }),
  )
})

async function showStayPush() {
  const settings = await readPushSettings()
  const category = TASK_BANK[settings.category] ? settings.category : 'mix'
  const tasks = TASK_BANK[category]
  const task = tasks[Math.floor(Math.random() * tasks.length)] || 'Din næste opgave er klar.'
  const explicit = settings.explicit === true
  await self.registration.showNotification(explicit ? settings.partnerTitle : 'Stay', {
    body: explicit ? task : 'Ny note. Åbn appen.',
    icon: './icon.svg',
    badge: './icon.svg',
    tag: 'stay-task',
    renotify: true,
    data: { url: APP_ROOT },
  })
}

async function readPushSettings() {
  try {
    const cache = await caches.open('stay-push-settings')
    const response = await cache.match(PUSH_CONFIG_URL)
    if (response) {
      const value = await response.json()
      return {
        explicit: value.explicit === true,
        partnerTitle: value.partnerTitle === 'Master' ? 'Master' : 'Mistress',
        category: typeof value.category === 'string' ? value.category : 'mix',
      }
    }
  } catch {
    // Diskret standard bruges, hvis enhedens lokale indstilling ikke kan læses.
  }
  return { explicit: false, partnerTitle: 'Stay', category: 'mix' }
}
