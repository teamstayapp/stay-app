import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Body,
  Breasts,
  EquipmentId,
  FetishId,
  Figure,
  Intensity,
  Line,
  Look,
  Nearness,
  Penis,
  Personality,
  Phase,
  PrivacyMode,
  Profile,
  Role,
  Skin,
} from './types'
import {
  FETISH_META,
  aftercare,
  aiLine,
  defaultUnlocked,
  intensityHint,
  onClose,
  onDeny,
  onFinish,
  onOk,
  onSafeword,
  onTooMuch,
  onMedia,
  replyToText,
  systemLine,
  youLine,
} from './engine/persona'
import { BLOCKED_REPLY, POLICY_SECTIONS, isBlocked } from './engine/policy'
import { ADDONS, PLANS } from './engine/plans'
import { currentAccount, logout, observeAccount, type Account } from './engine/auth'
import { aiIsConfigured, askAi } from './engine/ai'
import { AdminScreen, LoginScreen } from './screens/AuthScreens'
import { isStandalone } from './pwa'
import { availableScenes, DEFAULT_SCENES, observeScenes } from './engine/scenes'
import { observeChatName, saveChatName } from './engine/userProfile'
import {
  clearDeviceSession,
  hasDeviceSession,
  loadDeviceSession,
  loadPrivacyMode,
  saveDeviceSession,
  savePrivacyMode,
} from './engine/sessionStore'
import './App.css'

const ALL: FetishId[] = [
  'edge',
  'power',
  'aftercare',
  'cei',
  'milking',
  'joi',
  'chastity',
  'humiliation',
  'femdom',
  'anal',
  'worship',
  'roleskin',
]

const EQUIPMENT: Array<{ id: EquipmentId; title: string }> = [
  { id: 'lube', title: 'Glidecreme' },
  { id: 'vibrator', title: 'Vibrator' },
  { id: 'sleeve', title: 'Sleeve' },
  { id: 'dildo', title: 'Dildo' },
  { id: 'plug', title: 'Plug' },
  { id: 'strap_on', title: 'Strap-on' },
  { id: 'soft_cuffs', title: 'Bløde manchetter' },
  { id: 'blindfold', title: 'Bind for øjnene' },
  { id: 'chastity', title: 'Kyskhedsbur' },
]

const emptyProfile = (): Profile => ({
  chatName: '',
  privacyMode: 'private',
  sceneId: 'soft-care',
  role: 'slave',
  figure: 'mistress',
  look: 'clothed',
  body: 'athletic',
  skin: 'olive',
  breasts: 'medium',
  penis: 'large',
  personality: 'cold',
  customWish: '',
  nsfw: false,
  intensity: 'medium',
  fetishes: ['edge', 'power'],
  equipment: [],
  customEquipment: '',
  limits: {
    safeword: 'rød',
    cei: false,
    humiliation: false,
    noNameCalling: false,
  },
  unlocked: defaultUnlocked(),
  plan: 'free',
  imagesLeft: 2,
  extraPacks: false,
})

export default function App() {
  const [phase, setPhase] = useState<Phase>('age')
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const [near, setNear] = useState<Nearness>('ok')
  const [cycle, setCycle] = useState(1)
  const [running, setRunning] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [account, setAccount] = useState<Account | null>(() => currentAccount())
  const [returnPhase, setReturnPhase] = useState<Phase>('setup')
  const [decoyTaps, setDecoyTaps] = useState(0)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [rulesConfirmed, setRulesConfirmed] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [sceneCatalog, setSceneCatalog] = useState(DEFAULT_SCENES)
  const [savedSessionAvailable, setSavedSessionAvailable] = useState(false)
  const [back, setBack] = useState<Phase>('age')
  const [media, setMedia] = useState<{ url: string; kind: 'image' | 'video'; blob: Blob } | null>(null)
  const aiRequestRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const savedMediaBlobRef = useRef<Blob | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(
    () =>
      observeAccount((next) => {
        setAccount(next)
        if (next) {
          setProfile((current) => ({
            ...current,
            plan: next.plan,
            imagesLeft: next.imagesLeft,
          }))
        }
      }),
    [],
  )

  useEffect(() => {
    if (!account) return
    return observeScenes(setSceneCatalog)
  }, [account])

  useEffect(() => {
    if (!account) return
    return observeChatName(account.id, (chatName) => {
      setProfile((current) => current.chatName === chatName ? current : { ...current, chatName })
    })
  }, [account])

  useEffect(() => {
    if (!account) return
    const privacyMode = loadPrivacyMode(account.id)
    void hasDeviceSession(account.id).then((available) => {
      setSavedSessionAvailable(available)
      setProfile((current) => current.privacyMode === privacyMode ? current : { ...current, privacyMode })
    })
  }, [account])

  useEffect(() => {
    if (!account || profile.privacyMode !== 'device' || (phase !== 'session' && phase !== 'aftercare')) return
    const timer = window.setTimeout(() => {
      const blob = media?.blob ?? savedMediaBlobRef.current
      void saveDeviceSession(account.id, {
        profile,
        lines,
        near,
        cycle,
        running,
        savedAt: new Date().toISOString(),
        ...(blob ? { media: { kind: media?.kind || (blob.type.startsWith('video/') ? 'video' : 'image'), blob } } : {}),
      }).then(() => setSavedSessionAvailable(true))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [account, cycle, lines, media, near, phase, profile, running])

  useEffect(() => {
    if (phase !== 'session') return
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [aiThinking, lines, phase])

  function panic() {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    setReturnPhase(phase === 'decoy' ? returnPhase : phase)
    setDraft('')
    setPhase('decoy')
    setDecoyTaps(0)
  }
  function dropMedia() {
    if (media) URL.revokeObjectURL(media.url)
    setMedia(null)
    if (profile.privacyMode === 'private') savedMediaBlobRef.current = null
  }

  function choosePrivacyMode(mode: PrivacyMode) {
    setProfile((current) => ({ ...current, privacyMode: mode }))
    if (!account) return
    savePrivacyMode(account.id, mode)
    if (mode === 'private') {
      savedMediaBlobRef.current = null
      void clearDeviceSession(account.id).then(() => setSavedSessionAvailable(false))
    }
  }

  async function resumeSavedSession() {
    if (!account) return
    const saved = await loadDeviceSession(account.id)
    if (!saved) {
      setSavedSessionAvailable(false)
      return
    }
    dropMedia()
    const fallback = emptyProfile()
    setProfile({
      ...fallback,
      ...saved.profile,
      privacyMode: 'device',
      chatName: saved.profile.chatName || profile.chatName,
      limits: { ...fallback.limits, ...saved.profile.limits },
      plan: account.plan,
      imagesLeft: account.imagesLeft,
    })
    setLines(saved.lines)
    setNear(saved.near)
    setCycle(saved.cycle)
    setRunning(saved.running)
    if (saved.media?.blob) {
      savedMediaBlobRef.current = saved.media.blob
      setMedia({
        kind: saved.media.kind,
        blob: saved.media.blob,
        url: URL.createObjectURL(saved.media.blob),
      })
    } else {
      savedMediaBlobRef.current = null
    }
    setPhase('session')
  }

  async function deleteSavedSession() {
    if (!account) return
    await clearDeviceSession(account.id)
    savedMediaBlobRef.current = null
    setSavedSessionAvailable(false)
  }

  function openRules(from: Phase) {
    setBack(from)
    setPhase('rules')
  }

  const locked = useMemo(
    () => ALL.filter((id) => !profile.unlocked.includes(id) && !FETISH_META[id].free),
    [profile.unlocked],
  )

  function push(...ls: Line[]) {
    setLines((prev) => [...prev, ...ls])
  }

  function startSession() {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    const fetishes = profile.fetishes.filter(
      (f) => profile.unlocked.includes(f) || FETISH_META[f].free,
    )
    const p = { ...profile, fetishes }
    const scenes = availableScenes(sceneCatalog, p)
    const scene = scenes.find((item) => item.id === p.sceneId) ?? scenes[0]
    if (scene) p.sceneId = scene.id
    setProfile(p)
    if (account) void saveChatName(account.id, p.chatName).catch(() => undefined)
    if (account && p.privacyMode === 'private') {
      void clearDeviceSession(account.id).then(() => setSavedSessionAvailable(false))
    }
    setLines([
      systemLine(scene ? scene.title : 'Scene start'),
      aiLine(scene?.openingPrompt || 'Scenen er startet. Fortæl mig, hvad du ønsker.'),
    ])
    setCycle(1)
    setNear('ok')
    setRunning(true)
    savedMediaBlobRef.current = null
    dropMedia()
    setPhase('session')
  }

  function attachMedia(file: File) {
    if (isBlocked(file.name)) {
      push(systemLine('Filnavnet ramte bloklisten. Ikke brugt.'))
      return
    }
    const video = file.type.startsWith('video/')
    const image = file.type.startsWith('image/')
    if (!video && !image) {
      push(systemLine('Kun billede eller video.'))
      return
    }
    if (file.size > 40 * 1024 * 1024) {
      push(systemLine('For stor fil. Hold den under 40 MB.'))
      return
    }
    dropMedia()
    const url = URL.createObjectURL(file)
    const kind = video ? 'video' : 'image'
    savedMediaBlobRef.current = file
    setMedia({ url, kind, blob: file })
    push(youLine(kind === 'video' ? 'Viste et klip' : 'Viste et billede'), aiLine(onMedia(profile, kind)))
  }

  function tickSession(kind: 'close' | 'ok' | 'too' | 'deny' | 'finish' | 'safe') {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    if (kind === 'safe') {
      setRunning(false)
      push(youLine(profile.limits.safeword), aiLine(onSafeword()), systemLine('Aftercare'))
      dropMedia()
      setPhase('aftercare')
      return
    }
    if (kind === 'close') {
      setNear('close')
      setRunning(false)
      push(youLine('Tæt på'), aiLine(onClose(profile)))
      return
    }
    if (kind === 'too') {
      setNear('too_much')
      setRunning(false)
      push(youLine('For meget'), aiLine(onTooMuch(profile)))
      return
    }
    if (kind === 'ok') {
      setNear('ok')
      setCycle((c) => c + 1)
      setRunning(true)
      push(youLine('Ok — igen'), aiLine(onOk(profile, cycle + 1)))
      return
    }
    if (kind === 'deny') {
      setRunning(false)
      push(youLine('Må jeg?'), aiLine(onDeny(profile)))
      return
    }
    setRunning(false)
    push(youLine('Finish'), aiLine(onFinish(profile)), aiLine(aftercare(profile)))
    dropMedia()
    setPhase('aftercare')
  }

  async function sendText() {
    const t = draft.trim()
    if (!t || aiThinking) return
    setDraft('')
    if (t.toLowerCase() === profile.limits.safeword.toLowerCase()) {
      tickSession('safe')
      return
    }
    if (isBlocked(t)) {
      push(youLine(t), aiLine(BLOCKED_REPLY))
      return
    }
    if (!aiIsConfigured()) {
      push(youLine(t), aiLine(replyToText(profile, t, near)))
      return
    }

    const controller = new AbortController()
    aiRequestRef.current = controller
    setAiThinking(true)
    push(youLine(t))
    try {
      const reply = await askAi({ profile, near, cycle, lines, text: t, signal: controller.signal })
      push(aiLine(reply))
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Ukendt AI-fejl'
      push(systemLine(`AI kunne ikke svare: ${message}`), aiLine(replyToText(profile, t, near)))
    } finally {
      if (aiRequestRef.current === controller) aiRequestRef.current = null
      setAiThinking(false)
    }
  }

  function unlock(id: FetishId) {
    setProfile((p) => ({
      ...p,
      unlocked: p.unlocked.includes(id) ? p.unlocked : [...p.unlocked, id],
    }))
  }

  function toggleFetish(id: FetishId) {
    const meta = FETISH_META[id]
    if (!meta.free && !profile.unlocked.includes(id)) {
      setShopOpen(true)
      return
    }
    setProfile((p) => {
      const on = p.fetishes.includes(id)
      const fetishes = on ? p.fetishes.filter((f) => f !== id) : [...p.fetishes, id]
      return {
        ...p,
        fetishes,
        limits: {
          ...p.limits,
          cei: fetishes.includes('cei'),
          humiliation: fetishes.includes('humiliation'),
        },
      }
    })
  }

  function toggleEquipment(id: EquipmentId) {
    setProfile((current) => ({
      ...current,
      equipment: current.equipment.includes(id)
        ? current.equipment.filter((item) => item !== id)
        : [...current.equipment, id],
    }))
  }

  if (phase === 'login') {
    return (
      <LoginScreen
        onIn={(acc) => {
          setAccount(acc)
          setProfile({
            ...profile,
            plan: acc.plan,
            imagesLeft: acc.imagesLeft,
          })
          setPhase('setup')
        }}
        onAdmin={() => {
          setAccount(currentAccount())
          setPhase('admin')
        }}
      />
    )
  }

  if (phase === 'admin') {
    return (
      <AdminScreen
        onBack={() => {
          const acc = currentAccount()
          setAccount(acc)
          setPhase(acc?.role === 'admin' ? 'setup' : 'login')
        }}
      />
    )
  }

  if (phase === 'rules') {
    return (
      <main className="shell">
        <p className="kicker">Stay · regler</p>
        <h1>Forbudt og tilladt</h1>
        <p className="hint">Reglerne gælder for alle brugere og alle scener i Stay.</p>
        {POLICY_SECTIONS.map((s) => (
          <section key={s.title} className="sheet" style={{ marginTop: '0.75rem' }}>
            <h2 style={{ marginTop: 0 }}>{s.title}</h2>
            <p className="lede">{s.body}</p>
          </section>
        ))}
        <button className="primary" style={{ marginTop: '1.2rem' }} onClick={() => setPhase(back)}>
          Tilbage
        </button>
      </main>
    )
  }

  if (phase === 'decoy') {
    return (
      <main className="shell decoy">
        <p className="kicker" onClick={() => {
          const n = decoyTaps + 1
          setDecoyTaps(n)
          if (n >= 5) {
            setDecoyTaps(0)
            setPhase(returnPhase === 'decoy' ? 'setup' : returnPhase)
          }
        }}>
          Notes
        </p>
        <h1>Møde kl. 9</h1>
        <p className="lede">Indkøb. Tandlæge tirsdag. El-regning.</p>
        <p className="hint">Tomt dokument.</p>
      </main>
    )
  }

  if (phase === 'age') {
    return (
      <main className="shell">
        <p className="kicker">Stay</p>
        <h1>Velkommen til Stay</h1>
        <p className="lede">Stay er kun for voksne. Bekræft begge punkter for at fortsætte.</p>
        <div className="consent-card">
          <label className="consent-check">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
            />
            <span>Jeg bekræfter, at jeg er fyldt 18 år.</span>
          </label>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={rulesConfirmed}
              onChange={(e) => setRulesConfirmed(e.target.checked)}
            />
            <span>Jeg har læst og accepterer reglerne.</span>
          </label>
        </div>
        {!isStandalone() && (
          <p className="hint">
            PWA: i telefonens browser — Del / menu → “Føj til hjemmeskærm”. Derefter åbner den som en app.
            Ingen App Store.
          </p>
        )}
        <div className="row">
          <button className="ghost" onClick={() => openRules('age')}>
            Læs reglerne
          </button>
          <button
            className="primary"
            disabled={!ageConfirmed || !rulesConfirmed}
            onClick={() => setPhase('login')}
          >
            Fortsæt
          </button>
        </div>
      </main>
    )
  }

  if (phase === 'pay') {
    return (
      <main className="shell">
        <p className="kicker">Abonnement</p>
        <h1>Priser</h1>
        <p className="hint">
          Chat koster os øre. I tjener på billeder og Plus. Betaling er mock i MVP.
        </p>
        {PLANS.map((plan) => (
          <section key={plan.id} className="sheet" style={{ marginTop: '0.75rem' }}>
            <h2 style={{ marginTop: 0 }}>
              {plan.title} — {plan.dkkMonth} kr/md
            </h2>
            <p className="lede">{plan.blurb}</p>
            <p className="hint">
              {plan.text} · {plan.images} billeder · {plan.nsfw ? 'NSFW' : 'ikke NSFW'} ·{' '}
              {plan.packs ? 'alle pakker' : 'kun kerne'}
            </p>
            <button
              className={profile.plan === plan.id ? 'chip on' : 'primary'}
              onClick={() =>
                setProfile({
                  ...profile,
                  plan: plan.id,
                  nsfw: plan.nsfw ? profile.nsfw || plan.id !== 'free' : false,
                  imagesLeft: plan.images,
                  extraPacks: plan.packs,
                  unlocked: plan.packs ? ALL : defaultUnlocked(),
                })
              }
            >
              {profile.plan === plan.id ? 'Valgt' : 'Vælg'}
            </button>
          </section>
        ))}
        <h2>Tillæg</h2>
        {ADDONS.map((a) => (
          <div className="shop-row" key={a.id}>
            <div>
              <strong>
                {a.title} — {a.dkk} kr
              </strong>
              <p>{a.blurb}</p>
            </div>
            <button
              className="chip on"
              onClick={() =>
                setProfile({
                  ...profile,
                  imagesLeft: profile.imagesLeft + (a.images ?? 0),
                  extraPacks: profile.extraPacks || Boolean(a.packs),
                  unlocked: a.packs ? ALL : profile.unlocked,
                })
              }
            >
              Køb
            </button>
          </div>
        ))}
        <button className="ghost" style={{ marginTop: '1rem' }} onClick={() => setPhase('setup')}>
          Tilbage
        </button>
      </main>
    )
  }

  if (phase === 'setup') {
    const scenes = availableScenes(sceneCatalog, profile)
    const selectedScene = scenes.find((scene) => scene.id === profile.sceneId) ?? scenes[0]
    return (
      <main className="shell">
        <p className="kicker">Opsætning {account ? `· ${account.email}` : ''}</p>
        <div className="row">
          <button className="ghost" onClick={() => openRules('setup')}>
            Regler
          </button>
          {account?.role === 'admin' && (
            <button className="ghost" onClick={() => setPhase('admin')}>
              Admin
            </button>
          )}
          <button className="ghost" onClick={panic}>
            Noter
          </button>
          <button
            className="ghost"
            onClick={() => {
              logout()
              setAccount(null)
              setPhase('login')
            }}
          >
            Log ud
          </button>
        </div>
        <h1>Hvad har du lyst til?</h1>

        <label className="field chat-name-field">
          Dit chatnavn
          <input
            value={profile.chatName}
            maxLength={32}
            autoComplete="nickname"
            placeholder="Hvad skal din AI-partner kalde dig?"
            onChange={(e) => setProfile({ ...profile, chatName: e.target.value })}
            onBlur={() => {
              if (account) void saveChatName(account.id, profile.chatName).catch(() => undefined)
            }}
          />
          <span>Navnet gemmes på din profil og kan bruges naturligt i chatten.</span>
        </label>

        <section className="privacy-choice" aria-labelledby="privacy-title">
          <div>
            <h2 id="privacy-title">Skal samtalen gemmes?</h2>
            <p className="hint">Du kan ændre valget før hver ny scene.</p>
          </div>
          <label className={profile.privacyMode === 'private' ? 'privacy-option on' : 'privacy-option'}>
            <input
              type="radio"
              name="privacy-mode"
              checked={profile.privacyMode === 'private'}
              onChange={() => choosePrivacyMode('private')}
            />
            <span>
              <strong>Privat session</strong>
              <small>Gemmes ikke i appen. Chat og midlertidige billeder forsvinder, når sessionen forlades.</small>
            </span>
          </label>
          <label className={profile.privacyMode === 'device' ? 'privacy-option on' : 'privacy-option'}>
            <input
              type="radio"
              name="privacy-mode"
              checked={profile.privacyMode === 'device'}
              onChange={() => choosePrivacyMode('device')}
            />
            <span>
              <strong>Gem på denne enhed</strong>
              <small>Chat og lokale billeder gemmes i denne browser — ikke i Stay-skyen.</small>
            </span>
          </label>
          <p className="privacy-note">Beskeder sendes stadig til AI-tjenesten for at kunne blive besvaret. Valget styrer lagring i Stay.</p>
          {savedSessionAvailable && profile.privacyMode === 'device' && (
            <div className="saved-session-actions">
              <button className="primary" type="button" onClick={() => void resumeSavedSession()}>
                Fortsæt gemt chat
              </button>
              <button className="ghost" type="button" onClick={() => void deleteSavedSession()}>
                Slet gemt chat
              </button>
            </div>
          )}
        </section>

        <div className="scene-grid">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              className={selectedScene?.id === scene.id ? 'scene-card on' : 'scene-card'}
              onClick={() => setProfile({ ...profile, sceneId: scene.id })}
            >
              <strong>{scene.title}</strong>
              <span>{scene.blurb}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          Ekstra ønsker vises automatisk, når den tilhørende pakke er valgt og låst op.
        </p>

        <h2>Hvem er du i scenen?</h2>

        <div className="row">
          {(['slave', 'domme'] as Role[]).map((r) => (
            <button
              key={r}
              className={profile.role === r ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, role: r })}
            >
              {r === 'domme' ? 'Domme' : 'Slave'}
            </button>
          ))}
        </div>

        <h2>Figur (fiktiv voksen)</h2>
        <div className="row">
          {(['mistress', 'master'] as Figure[]).map((f) => (
            <button
              key={f}
              className={profile.figure === f ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, figure: f })}
            >
              {f === 'mistress' ? 'Mistress' : 'Master'}
            </button>
          ))}
        </div>

        <h2>NSFW</h2>
        <button
          className={profile.nsfw ? 'chip on' : 'chip'}
          onClick={() =>
            setProfile({
              ...profile,
              nsfw: !profile.nsfw,
              look: !profile.nsfw ? 'nsfw' : 'clothed',
            })
          }
        >
          {profile.nsfw ? 'NSFW slået til — nøgen og direkte' : 'NSFW slået fra — tøjet på'}
        </button>
        <p className="hint">
          Fra: pænere sprog og påklædt figur. Til: kønsdele, nøgenhed og frække ordrer. Stadig kun voksne.
        </p>

        <h2>Stil</h2>
        <div className="row">
          {(['clothed', 'fetish', 'nsfw'] as Look[]).map((look) => (
            <button
              key={look}
              className={profile.look === look ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, look })}
            >
              {look === 'clothed' ? 'Påklædt' : look === 'fetish' ? 'Fetish tøj' : 'Fræk / NSFW'}
            </button>
          ))}
        </div>
        <p className="hint">
          {profile.look === 'clothed' && 'Portræt med tøj. Default. Bedst til stores.'}
          {profile.look === 'fetish' && 'Latex, læder, choker — stadig tøj på.'}
          {profile.look === 'nsfw' &&
            'Valgfri nøgenhed og frække billeder. Kun fiktive voksne. Aldrig rigtige personer eller mindreårige.'}
        </p>
        <p className="hint">
          “Skab figur” kalder et image-API senere med de her sliders. Ingen race-play-pakke — hud og krop er bare udseende.
        </p>

        <h2>Krop</h2>
        <div className="row">
          {(['slim', 'athletic', 'solid'] as Body[]).map((b) => (
            <button
              key={b}
              className={profile.body === b ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, body: b })}
            >
              {b === 'slim' ? 'Slank' : b === 'athletic' ? 'Atletisk' : 'Kraftig'}
            </button>
          ))}
        </div>

        <h2>Hud</h2>
        <div className="row">
          {(['light', 'olive', 'brown', 'dark'] as Skin[]).map((s) => (
            <button
              key={s}
              className={profile.skin === s ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, skin: s })}
            >
              {s === 'light' ? 'Lys' : s === 'olive' ? 'Oliven' : s === 'brown' ? 'Brun' : 'Mørk'}
            </button>
          ))}
        </div>

        {profile.figure === 'mistress' && (
          <>
            <h2>Bryster</h2>
            <div className="row">
              {(['small', 'medium', 'large'] as Breasts[]).map((b) => (
                <button
                  key={b}
                  className={profile.breasts === b ? 'chip on' : 'chip'}
                  onClick={() => setProfile({ ...profile, breasts: b })}
                >
                  {b === 'small' ? 'Små' : b === 'medium' ? 'Mellem' : 'Store'}
                </button>
              ))}
            </div>
          </>
        )}

        {profile.figure === 'master' && (
          <>
            <h2>Penis</h2>
            <div className="row">
              {(['average', 'large', 'very_large'] as Penis[]).map((p) => (
                <button
                  key={p}
                  className={profile.penis === p ? 'chip on' : 'chip'}
                  onClick={() => setProfile({ ...profile, penis: p })}
                >
                  {p === 'average' ? 'Almindelig' : p === 'large' ? 'Stor' : 'Meget stor'}
                </button>
              ))}
            </div>
          </>
        )}

        <h2>Hvordan skal AI-partneren være?</h2>
        <p className="hint">Vælg en grundstil, eller skriv dit eget ønske nedenunder.</p>
        <div className="row">
          {(['warm', 'cold', 'tease', 'strict'] as Personality[]).map((p) => (
            <button
              key={p}
              className={profile.personality === p ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, personality: p })}
            >
              {p === 'warm' ? 'Blid' : p === 'cold' ? 'Kold' : p === 'tease' ? 'Drilsk' : 'Dominerende'}
            </button>
          ))}
        </div>
        <label className="field custom-wish-field">
          Eget ønske til samtalen
          <textarea
            value={profile.customWish}
            maxLength={300}
            rows={3}
            placeholder="Fx: Vær rolig i starten, men mere bestemt undervejs. Brug mit chatnavn en gang imellem."
            onChange={(e) => setProfile({ ...profile, customWish: e.target.value })}
          />
          <span>{profile.customWish.trim() ? 'Dit eget ønske bruges i stedet for grundstilen.' : 'Valgfrit · højst 300 tegn'}</span>
        </label>

        <h2>Intensitet</h2>
        <div className="row">
          {(['soft', 'medium', 'hard'] as Intensity[]).map((i) => (
            <button
              key={i}
              className={profile.intensity === i ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, intensity: i })}
            >
              {i === 'soft' ? 'Blød' : i === 'hard' ? 'Hård' : 'Medium'}
            </button>
          ))}
        </div>
        <p className="hint">{intensityHint(profile.intensity)}</p>

        <h2>Udstyr til rådighed</h2>
        <p className="hint">Vælg kun det, du faktisk har. AI-partneren tilpasser scenen efter listen.</p>
        <div className="equipment-grid">
          {EQUIPMENT.map((item) => (
            <label
              key={item.id}
              className={profile.equipment.includes(item.id) ? 'equipment-option on' : 'equipment-option'}
            >
              <input
                type="checkbox"
                checked={profile.equipment.includes(item.id)}
                onChange={() => toggleEquipment(item.id)}
              />
              <span>{item.title}</span>
            </label>
          ))}
        </div>
        <label className="field">
          Andet udstyr
          <input
            value={profile.customEquipment}
            maxLength={160}
            placeholder="Skriv andet udstyr, adskilt med komma"
            onChange={(e) => setProfile({ ...profile, customEquipment: e.target.value })}
          />
        </label>

        <h2>Fetish</h2>
        <div className="grid">
          {ALL.map((id) => {
            const meta = FETISH_META[id]
            const lockedPack = !meta.free && !profile.unlocked.includes(id)
            const active = profile.fetishes.includes(id)
            return (
              <button
                key={id}
                className={`pack ${active ? 'on' : ''} ${lockedPack ? 'locked' : ''}`}
                onClick={() => toggleFetish(id)}
              >
                <strong>{meta.title}</strong>
                <span>{lockedPack ? 'Tilkøb' : meta.blurb}</span>
              </button>
            )
          })}
        </div>

        <label className="field">
          Safeword
          <input
            value={profile.limits.safeword}
            onChange={(e) =>
              setProfile({
                ...profile,
                limits: { ...profile.limits, safeword: e.target.value || 'rød' },
              })
            }
          />
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={profile.limits.noNameCalling}
            onChange={(e) =>
              setProfile({
                ...profile,
                limits: { ...profile.limits, noNameCalling: e.target.checked },
              })
            }
          />
          Ingen øgenavne — også hvis humiliation er slået til
        </label>

        <p className="hint">
          Plan: {profile.plan} · figurer tilbage: {profile.imagesLeft}
        </p>
        <div className="row">
          <button className="ghost" onClick={() => setPhase('pay')}>
            Abonnement
          </button>
          <button className="ghost" onClick={() => setShopOpen(true)}>
            Butik ({locked.length} låst)
          </button>
          <button className="primary" onClick={startSession}>
            Start scene
          </button>
        </div>

        {shopOpen && (
          <div className="sheet">
            <h2>Pakker</h2>
            <p className="hint">MVP: unlock er lokalt. Rigtig betaling kommer senere.</p>
            {ALL.filter((id) => !FETISH_META[id].free).map((id) => (
              <div className="shop-row" key={id}>
                <div>
                  <strong>{FETISH_META[id].title}</strong>
                  <p>{FETISH_META[id].blurb}</p>
                </div>
                {profile.unlocked.includes(id) ? (
                  <span className="ok">Købt</span>
                ) : (
                  <button className="chip on" onClick={() => unlock(id)}>
                    Lås op
                  </button>
                )}
              </div>
            ))}
            <button className="ghost" onClick={() => setShopOpen(false)}>
              Luk
            </button>
          </div>
        )}
      </main>
    )
  }

  if (phase === 'aftercare') {
    return (
      <main className="shell">
        <p className="kicker">Aftercare</p>
        <button className="ghost" onClick={() => openRules('aftercare')}>
          Regler
        </button>
        <h1>Scene ovre</h1>
        <p className="lede">{aftercare(profile)}</p>
        <div className="log">
          {lines.slice(-4).map((l) => (
            <p key={l.id} className={l.from}>
              {l.text}
            </p>
          ))}
        </div>
        <button
          className="primary"
          onClick={() => {
            dropMedia()
            setPhase('setup')
            setLines([])
          }}
        >
          Tilbage til opsætning
        </button>
      </main>
    )
  }

  const activeScene = sceneCatalog.find((scene) => scene.id === profile.sceneId)
  const partnerName = profile.figure === 'mistress' ? 'Mistress' : 'Master'
  const userChatName = profile.chatName.trim() || 'Dig'

  return (
    <main className="shell session" data-running={running}>
      <header className="partner-card">
        <div className={profile.partnerImageUrl ? 'partner-portrait' : 'partner-portrait empty'}>
          {profile.partnerImageUrl ? (
            <img src={profile.partnerImageUrl} alt={`AI-partneren ${partnerName}`} />
          ) : (
            <span aria-label="Partnerbillede er ikke oprettet endnu">{partnerName.slice(0, 1)}</span>
          )}
        </div>
        <div className="partner-details">
          <span className="partner-status"><i /> AI-partner</span>
          <strong>{partnerName}</strong>
          <small>{activeScene?.title || 'Privat chat'} · {profile.nsfw ? 'NSFW' : 'SFW'} · cyklus {cycle}</small>
          <small className="privacy-status">
            {profile.privacyMode === 'private' ? 'Privat · gemmes ikke' : 'Gemmes kun på denne enhed'}
          </small>
          {!profile.partnerImageUrl && <small className="portrait-empty-text">Billede ikke oprettet endnu</small>}
        </div>
        <div className="chat-tools">
          <button className="note-button" onClick={panic}>Noter</button>
          <button className="safe" onClick={() => tickSession('safe')}>
            {profile.limits.safeword}
          </button>
        </div>
      </header>

      <div className="log chat-log" aria-live="polite">
        {lines.map((line) => line.from === 'system' ? (
          <div key={line.id} className="system-message"><span>{line.text}</span></div>
        ) : (
          <div key={line.id} className={`message ${line.from}`}>
            <span className="message-name">{line.from === 'ai' ? partnerName : userChatName}</span>
            <p>{line.text}</p>
          </div>
        ))}
        {aiThinking && (
          <div className="message ai thinking">
            <span className="message-name">{partnerName}</span>
            <p><i /><i /><i /><span className="sr-only">Skriver…</span></p>
          </div>
        )}

        {media && (
          <div className="preview chat-media">
            {media.kind === 'video' ? (
              <video src={media.url} controls playsInline />
            ) : (
              <img src={media.url} alt="Dit valgte medie" />
            )}
            <div className="preview-footer">
              <span>Kun på din telefon · ingen upload</span>
              <button type="button" onClick={dropMedia}>Skjul</button>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      <div className="chat-bottom">
        <div className="session-actions" aria-label="Hurtige scenevalg">
          <button onClick={() => tickSession('close')}>Tæt på</button>
          <button onClick={() => tickSession('ok')}>Igen</button>
          <button onClick={() => tickSession('too')}>For meget</button>
          <button onClick={() => tickSession('deny')}>Nægt</button>
          <button className="finish" onClick={() => tickSession('finish')}>Finish</button>
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            void sendText()
          }}
        >
          <button
            type="button"
            className="attach-button"
            aria-label="Vælg et lokalt billede eller videoklip"
            onClick={() => fileRef.current?.click()}
          >
            +
          </button>
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendText()
              }
            }}
            placeholder={`Skriv til ${partnerName}…`}
            aria-label={`Skriv en besked til ${partnerName}`}
            disabled={aiThinking}
          />
          <button className="send-button" type="submit" disabled={aiThinking || !draft.trim()}>
            {aiThinking ? '···' : 'Send'}
          </button>
        </form>
        <p className="chat-caption">{aiIsConfigured() ? 'AI-chat aktiv' : 'Demo-svar'} · Billeder fra + bliver på din telefon</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) attachMedia(file)
        }}
      />
    </main>
  )
}
