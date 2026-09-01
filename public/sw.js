const CACHE = 'stay-v12'
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
  estim: [
    'Brug kun færdigt e-stim-legetøj. Ét lavt hak op; stop straks ved smerte, svie eller følelsesløshed.',
    'Skru e-stim ned og pust roligt ud.',
    'E-stim slukket i to minutter. Hænderne væk.',
    'E-stim på lavt niveau. Ingen elektroder på hoved, hals, bryst eller beskadiget hud.',
  ],
  cei: [
    'Kondom på. Opsaml kun, hvis det er frivilligt og aftalt.',
    'Tjek kondomet og skriv kort, hvad du ser.',
    'Edge i kondomet. Ingen udløsning endnu.',
    'Hvis du kom i kondomet: vent på næste besked. Brug kun frisk indhold og kassér det ved tvivl.',
  ],
  work: [
    'Tjek diskret, at lingeriet sidder under tøjet. Ingen handling foran andre.',
    'Hvis en plug allerede er sikker og behagelig, bliver den hvor den er. Stop ved smerte eller følelsesløshed.',
    'Ingen berøring på arbejde eller offentligt. Vent, til du er helt privat.',
    'Skriv “på plads”, når tøjet sidder diskret. Mere først, når du er privat.',
  ],
  kegel: [
    'Almindelig kegel: knib 8 sekunder. Slip. Gentag 5 gange.',
    'Kegel nu. Hold 5 sekunder. Pust ud.',
    'Ti rolige knib. Ingen anden berøring.',
  ],
  reverse_kegel: [
    'Reverse kegel: skub blidt ud i 6 sekunder. Slip.',
    'Reverse kegel. Afspænd bækkenbunden i 8 sekunder. Ingen knib.',
    'Skift: reverse kegel 5 sekunder, pause, så ét almindeligt knib.',
  ],
}
TASK_BANK.mix = Object.values(TASK_BANK).flat()

self.addEventListener('push', (event) => {
  event.waitUntil(showStayPush())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const task = (event.notification.data && event.notification.data.task) || event.notification.body || ''
  const target = APP_ROOT + (task ? `#stay-task=${encodeURIComponent(task)}` : '')
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.registration.scope))
      if (existing) {
        existing.postMessage({ type: 'stay-task', task })
        return existing.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})

async function showStayPush() {
  const settings = await readPushSettings()
  const availableCategories = [...new Set([...Object.keys(TASK_BANK), ...Object.keys(settings.taskBank || {})])]
  const categoryExists = (category) => availableCategories.includes(category)
  const selected = Array.isArray(settings.categories)
    ? settings.categories.filter((category) => typeof category === 'string' && categoryExists(category))
    : []
  const categories = selected.length
    ? selected
    : [categoryExists(settings.category) ? settings.category : 'mix']
  const concreteCategories = categories.includes('mix')
    ? availableCategories.filter((category) => category !== 'mix')
    : categories
  const tasks = concreteCategories.flatMap((category) => {
    if (Object.prototype.hasOwnProperty.call(settings.taskBank || {}, category)) {
      return Array.isArray(settings.taskBank[category])
        ? settings.taskBank[category].filter((entry) => typeof entry === 'string' && entry.trim()).slice(0, 24)
        : []
    }
    return TASK_BANK[category] || []
  })
  const task = tasks[Math.floor(Math.random() * tasks.length)] || 'Din næste opgave er klar.'
  const explicit = settings.explicit === true
  await self.registration.showNotification(explicit ? settings.partnerTitle : 'Stay', {
    body: explicit ? task : 'Ny note. Åbn appen.',
    icon: './icon.svg',
    badge: './icon.svg',
    tag: 'stay-task',
    renotify: true,
    data: { url: APP_ROOT + `#stay-task=${encodeURIComponent(task)}`, task },
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
        categories: Array.isArray(value.categories) ? value.categories : [],
        taskBank: value.taskBank && typeof value.taskBank === 'object' ? value.taskBank : {},
      }
    }
  } catch {
    // Diskret standard bruges, hvis enhedens lokale indstilling ikke kan læses.
  }
  return { explicit: false, partnerTitle: 'Stay', category: 'mix', categories: ['mix'], taskBank: {} }
}
