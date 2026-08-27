import { useMemo, useRef, useState } from 'react'
import type {
  Body,
  Breasts,
  FetishId,
  Figure,
  Intensity,
  Line,
  Look,
  Nearness,
  Penis,
  Personality,
  Phase,
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
  onStart,
  onTooMuch,
  onMedia,
  opening,
  replyToText,
  systemLine,
  youLine,
} from './engine/persona'
import { BLOCKED_REPLY, POLICY_SECTIONS, POLICY_TEXT, isBlocked } from './engine/policy'
import { ADDONS, PLANS } from './engine/plans'
import { currentAccount, logout, type Account } from './engine/auth'
import { AdminScreen, LoginScreen } from './screens/AuthScreens'
import { isStandalone } from './pwa'
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

const emptyProfile = (): Profile => ({
  role: 'slave',
  figure: 'mistress',
  look: 'clothed',
  body: 'athletic',
  skin: 'olive',
  breasts: 'medium',
  penis: 'large',
  personality: 'cold',
  nsfw: false,
  intensity: 'medium',
  fetishes: ['edge', 'power'],
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

  function panic() {
    setReturnPhase(phase === 'decoy' ? returnPhase : phase)
    setDraft('')
    setPhase('decoy')
    setDecoyTaps(0)
  }
  const [back, setBack] = useState<Phase>('age')
  const [media, setMedia] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function dropMedia() {
    if (media) URL.revokeObjectURL(media.url)
    setMedia(null)
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
    const fetishes = profile.fetishes.filter(
      (f) => profile.unlocked.includes(f) || FETISH_META[f].free,
    )
    const p = { ...profile, fetishes }
    setProfile(p)
    setLines([systemLine('Scene start'), aiLine(opening(p)), aiLine(onStart(p))])
    setCycle(1)
    setNear('ok')
    setRunning(true)
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
    setMedia({ url, kind })
    push(youLine(kind === 'video' ? 'Viste et klip' : 'Viste et billede'), aiLine(onMedia(profile, kind)))
  }

  function tickSession(kind: 'close' | 'ok' | 'too' | 'deny' | 'finish' | 'safe') {
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

  function sendText() {
    const t = draft.trim()
    if (!t) return
    setDraft('')
    if (t.toLowerCase() === profile.limits.safeword.toLowerCase()) {
      tickSession('safe')
      return
    }
    if (isBlocked(t)) {
      push(youLine(t), aiLine(BLOCKED_REPLY))
      return
    }
    push(youLine(t), aiLine(replyToText(profile, t, near)))
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
        <p className="hint">Den her side er den, I kan pege på over for stores og betaling.</p>
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
        <h1>Kun 18+</h1>
        <p className="lede">{POLICY_TEXT}</p>
        {!isStandalone() && (
          <p className="hint">
            PWA: i telefonens browser — Del / menu → “Føj til hjemmeskærm”. Derefter åbner den som en app.
            Ingen App Store.
          </p>
        )}
        <div className="row">
          <button className="ghost" onClick={() => openRules('age')}>
            Fuld regelside
          </button>
          <button className="primary" onClick={() => setPhase('login')}>
            Jeg er 18+ og accepterer reglerne
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
        <h1>Hvem er du i scenen?</h1>

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

        <h2>Personlighed</h2>
        <div className="row">
          {(['warm', 'cold', 'tease', 'strict'] as Personality[]).map((p) => (
            <button
              key={p}
              className={profile.personality === p ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, personality: p })}
            >
              {p === 'warm' ? 'Varm' : p === 'cold' ? 'Kold' : p === 'tease' ? 'Drilsk' : 'Streng'}
            </button>
          ))}
        </div>

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

  return (
    <main className="shell session" data-running={running}>
      <header className="top">
        <span>
          {profile.role === 'domme' ? 'Domme' : 'Slave'} · {profile.nsfw ? 'NSFW' : 'SFW'} · cyklus {cycle}
        </span>
        <span className="row">
          <button
            className={profile.nsfw ? 'chip on' : 'ghost'}
            onClick={() =>
              setProfile({
                ...profile,
                nsfw: !profile.nsfw,
                look: !profile.nsfw ? 'nsfw' : 'clothed',
              })
            }
          >
            {profile.nsfw ? 'NSFW on' : 'NSFW off'}
          </button>
          <button className="ghost" onClick={panic}>
            Noter
          </button>
          <button className="ghost" onClick={() => openRules('session')}>
            Regler
          </button>
          <button className="safe" onClick={() => tickSession('safe')}>
            {profile.limits.safeword}
          </button>
        </span>
      </header>

      <div className="log">
        {lines.map((l) => (
          <p key={l.id} className={l.from}>
            {l.text}
          </p>
        ))}
      </div>

      {media && (
        <div className="preview">
          {media.kind === 'video' ? (
            <video src={media.url} controls playsInline />
          ) : (
            <img src={media.url} alt="" />
          )}
          <button className="ghost" type="button" onClick={dropMedia}>
            Skjul
          </button>
          <p className="hint">Kun på din telefon. Sendes ikke nogen steder.</p>
        </div>
      )}

      <div className="big">
        <button onClick={() => tickSession('close')}>Tæt på</button>
        <button onClick={() => tickSession('ok')}>Igen</button>
        <button onClick={() => tickSession('too')}>For meget</button>
        <button onClick={() => tickSession('deny')}>Nægt</button>
        <button className="finish" onClick={() => tickSession('finish')}>
          Tillad finish
        </button>
      </div>

      <form
        className="talk"
        onSubmit={(e) => {
          e.preventDefault()
          sendText()
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Skriv til personen…"
        />
        <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
          Vis
        </button>
        <button type="submit">Send</button>
      </form>
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
      <p className="hint">Vis = lokalt billede eller klip. Ingen upload.</p>
    </main>
  )
}
