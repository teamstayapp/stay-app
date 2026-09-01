import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AssSize,
  Body,
  Breasts,
  CockPreset,
  EquipmentId,
  EyeColor,
  FacialHair,
  FetishId,
  Figure,
  HairColor,
  HairLength,
  HairStyle,
  HipSize,
  ImagePose,
  Intensity,
  Line,
  Look,
  Makeup,
  Nearness,
  NotificationStyle,
  Penis,
  Personality,
  PlayMode,
  Phase,
  PrivacyMode,
  Profile,
  PubicStyle,
  Role,
  Skin,
  Attraction,
  UserAnatomy,
  UserGender,
} from './types'
import {
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
import { aiIsConfigured, analyzeImage, askAi, generatePartnerImage, generatePartnerPose } from './engine/ai'
import { AdminScreen, LoginScreen } from './screens/AuthScreens'
import { isStandalone } from './pwa'
import { availableScenes, DEFAULT_SCENES, observeScenes, openingPromptForPlan } from './engine/scenes'
import {
  daysSinceOrgasm,
  loadFrueState,
  lockBlocksClimax,
  saveFrueState,
  statusLine,
  type FrueState,
} from './engine/frue'
import {
  DEFAULT_CONTENT_CATALOG,
  observeContentCatalog,
  planCanUseContent,
  type ContentCatalog,
} from './engine/contentCatalog'
import { PROFESSIONS } from './engine/professions'
import { observeChatName, observePartnerName, saveChatName, savePartnerName } from './engine/userProfile'
import {
  DEFAULT_USAGE_CONFIG,
  currentUsagePeriod,
  entitlementIsExpired,
  ensureUserProfile,
  limitsForPlan,
  observeEntitlement,
  observeUsageConfig,
  observeUserUsage,
  requestAddonPurchase,
  requestPlanPurchase,
  type Entitlement,
  type UsageSnapshot,
} from './engine/usage'
import {
  clearDeviceSession,
  clearDeviceMemory,
  hasDeviceSession,
  loadAvailability,
  loadDeviceMemory,
  loadDeviceSession,
  loadNotificationStyle,
  loadPanicDestination,
  loadPrivacyMode,
  loadTaskPlan,
  loadTaskBank,
  saveDeviceSession,
  saveAvailability,
  saveDeviceMemory,
  saveNotificationStyle,
  savePanicDestination,
  savePrivacyMode,
  saveTaskPlan,
  saveTaskBank,
  DEFAULT_TASK_PLAN,
  DEFAULT_TASK_BANK,
  type TaskCategory,
  type TaskBank,
  type TaskPlan,
  type PanicDestination,
} from './engine/sessionStore'
import {
  hasStayPushSubscription,
  subscribeStayPush,
  unsubscribeStayPush,
  updateStayPush,
} from './engine/push'
import {
  BODY_ZONES,
  bodyMapSrc,
  localTouchReply,
  touchUserLine,
  type BodyView,
  type BodyZone,
  type BodyZoneId,
} from './engine/bodyZones'
import {
  clearFavoriteLook,
  loadFavoriteLook,
  saveFavoriteLook,
  type FavoriteLook,
} from './engine/favoriteImage'
import { loadPartnerGallery, savePartnerGallery } from './engine/partnerGallery'
import { localClimaxReply, localCloseReply } from './engine/climax'
import './App.css'

const TASK_CATEGORY_LABELS: Record<string, string> = {
  mix: 'Blandet',
  lingerie: 'Lingeri',
  edge: 'Edge',
  sissy: 'Sissy',
  protocol: 'Protocol',
  worship: 'Worship',
  estim: 'E-stim',
  cei: 'Kondom / CEI',
  work: 'Diskret ude',
  kegel: 'Kegel',
  reverse_kegel: 'Reverse kegel',
}

function playStaySound(kind: 'moan' | 'come', existingContext?: AudioContext) {
  try {
    const context = existingContext || new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = kind === 'come' ? 180 : 240
    gain.gain.value = 0.0001
    oscillator.connect(gain)
    gain.connect(context.destination)
    const now = context.currentTime
    gain.gain.exponentialRampToValueAtTime(kind === 'come' ? 0.05 : 0.03, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'come' ? 0.9 : 0.45))
    oscillator.start(now)
    oscillator.stop(now + (kind === 'come' ? 1 : 0.5))
    if (!existingContext) window.setTimeout(() => void context.close(), 1500)
  } catch {
    // Lyd er valgfri og må aldrig blokere chatten.
  }
}

function profileWithCatalog(
  profile: Profile,
  catalog: ContentCatalog,
  extra?: { liveStatusText?: string; workMode?: boolean; orgasmLockText?: string },
): Profile {
  const selectedFetishes = catalog.fetishes.filter((item) => item.enabled && profile.fetishes.includes(item.id))
  const selectedEquipment = catalog.equipment.filter(
    (item) => item.enabled && planCanUseContent(profile.plan, item) && profile.equipment.includes(item.id),
  )
  return {
    ...profile,
    fetishLabels: selectedFetishes.map((item) => item.title),
    equipmentLabels: selectedEquipment.map((item) => item.prompt || item.title),
    equipmentEntries: selectedEquipment.map((item) => ({ id: item.id, label: item.prompt || item.title })),
    spicyLexicon: catalog.words.filter((item) => item.enabled).map((item) => `${item.title} = ${item.prompt}`).join('; ').slice(0, 1_200),
    spicyMinus: catalog.wordsMinus.filter((item) => item.enabled).map((item) => item.title).join(', ').slice(0, 600),
    catalogPrompt: selectedFetishes.map((item) => item.prompt).filter(Boolean).join(' '),
    liveStatusText: extra?.liveStatusText,
    workMode: extra?.workMode,
    orgasmLockText: extra?.orgasmLockText,
  }
}

const emptyProfile = (): Profile => ({
  chatName: '',
  partnerName: '',
  privacyMode: 'private',
  notificationStyle: 'discreet',
  sceneId: 'soft-care',
  role: 'slave',
  playMode: 'oneway',
  figure: 'mistress',
  userAnatomy: 'penis',
  userGender: 'unset',
  attraction: 'both',
  partnerAge: 28,
  cockPreset: 'none',
  likeWords: '',
  banWords: '',
  look: 'clothed',
  imagePose: 'portrait',
  profession: 'none',
  body: 'athletic',
  skin: 'olive',
  breasts: 'medium',
  penis: 'large',
  hairColor: 'brown',
  hairLength: 'long',
  hairStyles: [],
  eyes: 'brown',
  makeup: 'soft',
  facialHair: 'none',
  ass: 'round',
  hips: 'soft',
  pubic: 'trimmed',
  freckles: false,
  tattoos: false,
  wet: false,
  lookWish: '',
  personality: 'cold',
  customWish: '',
  memoryNotes: '',
  lastMemory: '',
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
  extraPacks: false,
  lingerieUser: [],
  lingeriePartner: [],
})

function partnerDisplayName(profile: Pick<Profile, 'partnerName' | 'figure'>): string {
  return profile.partnerName.trim() || (profile.figure === 'mistress' ? 'Mistress' : 'Master')
}

function PartnerAgeInput({ value, onChange }: { value: number; onChange: (age: number) => void }) {
  const [draft, setDraft] = useState(String(value))

  function commitAge() {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) ? Math.max(18, Math.min(80, parsed)) : value
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      value={draft}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 2))}
      onBlur={commitAge}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('age')
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [frue, setFrue] = useState<FrueState>(() => loadFrueState())
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const [near, setNear] = useState<Nearness>('ok')
  const [cycle, setCycle] = useState(1)
  const [partnerHeat, setPartnerHeat] = useState(12)
  const [userHeat, setUserHeat] = useState(8)
  const [aftercareReason, setAftercareReason] = useState<'finish' | 'safeword'>('finish')
  const [running, setRunning] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [account, setAccount] = useState<Account | null>(() => currentAccount())
  const [returnPhase, setReturnPhase] = useState<Phase>('home')
  const [decoyTaps, setDecoyTaps] = useState(0)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [rulesConfirmed, setRulesConfirmed] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [bodyOpen, setBodyOpen] = useState(false)
  const [bodyView, setBodyView] = useState<BodyView>('front')
  const [stageOpen, setStageOpen] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState<{ url: string; alt: string } | null>(null)
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const [edgeMode, setEdgeMode] = useState<'idle' | 'play' | 'hold'>('idle')
  const [edgeLeft, setEdgeLeft] = useState(0)
  const [strokeLeft, setStrokeLeft] = useState(0)
  const [saveNotice, setSaveNotice] = useState('')
  const [favoriteLook, setFavoriteLook] = useState<FavoriteLook | null>(null)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageNotice, setImageNotice] = useState('')
  const [gallery, setGallery] = useState<string[]>([])
  const [soundOn, setSoundOn] = useState(false)
  const [availableOn, setAvailableOn] = useState(false)
  const [availabilityNotice, setAvailabilityNotice] = useState('')
  const [activeTask, setActiveTask] = useState('')
  const [taskPlan, setTaskPlan] = useState<TaskPlan>(DEFAULT_TASK_PLAN)
  const [taskBank, setTaskBank] = useState<TaskBank>(DEFAULT_TASK_BANK)
  const [taskEditorCategory, setTaskEditorCategory] = useState<TaskCategory>('lingerie')
  const [deviceSettingsUserId, setDeviceSettingsUserId] = useState('')
  const notificationAiRequestRef = useRef<(
    text: string,
    intent: 'chat' | 'task' | 'touch' | 'close' | 'climax',
    visibleText?: string,
  ) => Promise<string | undefined>>(async () => undefined)
  const partnerPeakRef = useRef(false)
  const moanLockRef = useRef(false)
  const soundContextRef = useRef<AudioContext | null>(null)
  const [purchaseNotice, setPurchaseNotice] = useState('')
  const [usageConfig, setUsageConfig] = useState(DEFAULT_USAGE_CONFIG)
  const [usage, setUsage] = useState<UsageSnapshot>({
    chatToday: 0,
    chatMonth: 0,
    imageGenerations: 0,
    imageAnalyses: 0,
    models: {},
  })
  const [entitlement, setEntitlement] = useState<Entitlement>({
    plan: 'free',
    status: 'active',
    expiresAt: null,
    extraPacks: false,
    bonusPeriod: currentUsagePeriod(),
    bonusImageGenerations: 0,
    bonusImageAnalyses: 0,
  })
  const [entitlementLoaded, setEntitlementLoaded] = useState(false)
  const [sceneCatalog, setSceneCatalog] = useState(DEFAULT_SCENES)
  const [contentCatalog, setContentCatalog] = useState(DEFAULT_CONTENT_CATALOG)
  const aiProfile = profileWithCatalog(profile, contentCatalog, {
    liveStatusText: statusLine(frue.status),
    workMode: frue.workMode || frue.status.place === 'work',
    orgasmLockText: lockBlocksClimax(frue),
  })
  const activeTaskGroups = useMemo(
    () => contentCatalog.taskGroups.filter((group) => group.enabled).sort((a, b) => a.order - b.order),
    [contentCatalog.taskGroups],
  )
  const activeTaskCategories = useMemo(
    () => ['mix', ...activeTaskGroups.filter((group) => group.id !== 'mix').map((group) => group.id)],
    [activeTaskGroups],
  )
  const adminTaskBank = useMemo(() => {
    const bank = Object.fromEntries(activeTaskGroups.map((group) => [
      group.id,
      group.tasks.filter((task) => task.enabled).map((task) => task.text),
    ])) as TaskBank
    bank.mix = activeTaskGroups
      .filter((group) => group.id !== 'mix')
      .flatMap((group) => group.tasks.filter((task) => task.enabled).map((task) => task.text))
    return bank
  }, [activeTaskGroups])
  const taskCategoryLabel = (category: string) => (
    activeTaskGroups.find((group) => group.id === category)?.title
    || TASK_CATEGORY_LABELS[category]
    || category
  )
  const [savedSessionAvailable, setSavedSessionAvailable] = useState(false)
  const [panicDestination, setPanicDestination] = useState<PanicDestination>({
    mode: 'decoy',
    customUrl: '',
    shortcutName: '',
  })
  const [back, setBack] = useState<Phase>('age')
  const [media, setMedia] = useState<{ url: string; kind: 'image' | 'video'; blob: Blob } | null>(null)
  const aiRequestRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const savedMediaBlobRef = useRef<Blob | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taskPhotoRef = useRef<HTMLInputElement>(null)

  useEffect(
    () =>
      observeAccount((next) => {
        setAccount(next)
        if (!next) {
          setEntitlementLoaded(false)
          setFavoriteLook(null)
          setGallery([])
          setAvailableOn(false)
          setTaskPlan(DEFAULT_TASK_PLAN)
          setTaskBank(DEFAULT_TASK_BANK)
          setDeviceSettingsUserId('')
          setProfile((current) => ({ ...current, partnerImageUrl: undefined }))
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
    return observeContentCatalog(setContentCatalog)
  }, [account])

  useEffect(() => {
    if (!account) return
    return observeChatName(account.id, (chatName) => {
      setProfile((current) => current.chatName === chatName ? current : { ...current, chatName })
    })
  }, [account])

  useEffect(() => {
    if (!account) return
    return observePartnerName(account.id, (partnerName) => {
      setProfile((current) => current.partnerName === partnerName ? current : { ...current, partnerName })
    })
  }, [account])

  useEffect(() => {
    if (!account) return
    void ensureUserProfile(account.id, account.email).catch(() => undefined)
    const stopConfig = observeUsageConfig(setUsageConfig)
    const stopEntitlement = observeEntitlement(account.id, (value) => {
      const effective = account.role === 'admin'
        ? { ...value, plan: 'plus' as const, status: 'active' as const, expiresAt: null }
        : value
      setEntitlement(effective)
      setEntitlementLoaded(true)
      setProfile((current) => ({
        ...current,
        plan: effective.plan,
        extraPacks: effective.extraPacks || effective.plan === 'plus',
        unlocked: effective.extraPacks || effective.plan === 'plus'
          ? contentCatalog.fetishes.map((item) => item.id)
          : contentCatalog.fetishes.filter((item) => item.free).map((item) => item.id),
        nsfw: effective.plan === 'free' ? false : current.nsfw,
        look: effective.plan === 'free' && current.look === 'nsfw' ? 'clothed' : current.look,
      }))
    })
    const stopUsage = observeUserUsage(account.id, setUsage)
    return () => { stopConfig(); stopEntitlement(); stopUsage() }
  }, [account, contentCatalog.fetishes])

  useEffect(() => {
    if (!account) return
    if (loadPrivacyMode(account.id) !== 'device') {
      const timer = window.setTimeout(() => setFavoriteLook(null), 0)
      return () => window.clearTimeout(timer)
    }
    let active = true
    void loadFavoriteLook(account.id).then((look) => {
      if (!active) return
      setFavoriteLook(look)
      setProfile((current) => ({
        ...current,
        partnerImageUrl: look?.imageUrl,
        ...(look ? { figure: look.figure, partnerName: look.partnerName || current.partnerName } : {}),
      }))
    })
    return () => { active = false }
  }, [account])

  useEffect(() => {
    if (!account || loadPrivacyMode(account.id) !== 'device') return
    let active = true
    void loadPartnerGallery(account.id).then((imageUrls) => {
      if (active) setGallery(imageUrls)
    })
    return () => { active = false }
  }, [account])

  useEffect(() => {
    if (!account) return
    const privacyMode = loadPrivacyMode(account.id)
    const notificationStyle = loadNotificationStyle(account.id)
    const savedPanicDestination = loadPanicDestination(account.id)
    const savedTaskPlan = loadTaskPlan(account.id)
    const savedTaskBank = loadTaskBank(account.id, adminTaskBank)
    const memory = privacyMode === 'device' ? loadDeviceMemory(account.id) : { notes: '', last: '' }
    void Promise.all([hasDeviceSession(account.id), hasStayPushSubscription()]).then(([available, pushActive]) => {
      setSavedSessionAvailable(available)
      setAvailableOn(
        loadAvailability(account.id)
        && pushActive
        && 'Notification' in window
        && Notification.permission === 'granted',
      )
      const selectedTaskCategories = savedTaskPlan.categories.filter((category) => activeTaskCategories.includes(category))
      const normalizedTaskCategories = selectedTaskCategories.length ? selectedTaskCategories : ['mix']
      setTaskPlan({ ...savedTaskPlan, category: normalizedTaskCategories[0], categories: normalizedTaskCategories })
      setTaskBank({ ...adminTaskBank, ...savedTaskBank })
      setTaskEditorCategory((current) => activeTaskCategories.includes(current)
        ? current
        : activeTaskCategories.find((category) => category !== 'mix') || 'mix')
      setProfile((current) => ({
        ...current,
        privacyMode,
        notificationStyle,
        memoryNotes: memory.notes,
        lastMemory: memory.last,
      }))
      setPanicDestination(savedPanicDestination)
      setDeviceSettingsUserId(account.id)
    })
  }, [account, activeTaskCategories, adminTaskBank])

  useEffect(() => {
    if (!account || deviceSettingsUserId !== account.id || profile.privacyMode !== 'device') return
    saveDeviceMemory(account.id, { notes: profile.memoryNotes, last: profile.lastMemory })
  }, [account, deviceSettingsUserId, profile.lastMemory, profile.memoryNotes, profile.privacyMode])

  useEffect(() => {
    if (!account || deviceSettingsUserId !== account.id) return
    saveAvailability(account.id, availableOn)
  }, [account, availableOn, deviceSettingsUserId])

  useEffect(() => {
    if (!account || deviceSettingsUserId !== account.id) return
    saveTaskPlan(account.id, taskPlan)
  }, [account, deviceSettingsUserId, taskPlan])

  useEffect(() => {
    if (!account || deviceSettingsUserId !== account.id) return
    saveTaskBank(account.id, taskBank)
  }, [account, deviceSettingsUserId, taskBank])

  useEffect(() => {
    saveFrueState(frue)
  }, [frue])

  useEffect(() => {
    if (!account) return
    function receiveTask(raw: string) {
      const task = raw.replace(/^Stay · /, '').trim()
      if (!task || task === 'Ny note. Åbn appen.') return
      setPhase('session')
      setActiveTask(task)
      if (!aiThinking) {
        void notificationAiRequestRef.current(
          `Ny opgave fra notifikation: ${task}. Tag den i rollen. Bekræft opgaven kort og sig hvad jeg skal gøre nu.`,
          'task',
          `Opgave: ${task}`,
        )
      }
    }
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'stay-task' && typeof event.data.task === 'string') receiveTask(event.data.task)
    }
    function fromHash() {
      if (!window.location.hash.startsWith('#stay-task=')) return
      try {
        receiveTask(decodeURIComponent(window.location.hash.slice('#stay-task='.length)))
      } finally {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    window.addEventListener('hashchange', fromHash)
    queueMicrotask(fromHash)
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      window.removeEventListener('hashchange', fromHash)
    }
  }, [account, aiThinking])

  useEffect(() => {
    if (!availableOn || !account || deviceSettingsUserId !== account.id) return
    void updateStayPush({
      explicit: profile.notificationStyle === 'explicit' && !frue.workMode && frue.status.place !== 'work',
      partnerTitle: profile.partnerName.trim() || (profile.figure === 'mistress' ? 'Mistress' : 'Master'),
      plan: taskPlan,
      taskBank,
    }).then((error) => {
      if (error) setAvailabilityNotice(error)
    })
  }, [account, availableOn, deviceSettingsUserId, frue.status.place, frue.workMode, profile.figure, profile.notificationStyle, profile.partnerName, taskBank, taskPlan])

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

  useEffect(() => {
    if (phase !== 'decoy') document.title = 'Stay'
  }, [phase])

  async function panic() {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    setBodyOpen(false)
    setReturnPhase(phase === 'decoy' ? returnPhase : phase)
    setDraft('')
    setPhase('decoy')
    setDecoyTaps(0)
    document.title = 'Noter'

    if (account && profile.privacyMode === 'device' && (phase === 'session' || phase === 'aftercare')) {
      const blob = media?.blob ?? savedMediaBlobRef.current
      try {
        await saveDeviceSession(account.id, {
          profile,
          lines,
          near,
          cycle,
          running,
          savedAt: new Date().toISOString(),
          ...(blob ? { media: { kind: media?.kind || (blob.type.startsWith('video/') ? 'video' : 'image'), blob } } : {}),
        })
        setSavedSessionAvailable(true)
      } catch {
        // Den diskrete side skal stadig åbne, selv hvis enhedslageret er fyldt eller blokeret.
      }
    }

    const destination = panicDestination.mode === 'weather'
      ? 'https://www.google.com/search?q=vejret'
      : panicDestination.mode === 'calendar'
        ? 'https://calendar.google.com/'
        : panicDestination.mode === 'shortcut' && panicDestination.shortcutName.trim()
          ? `shortcuts://run-shortcut?name=${encodeURIComponent(panicDestination.shortcutName.trim())}`
        : panicDestination.mode === 'custom'
          ? panicDestination.customUrl.trim()
          : ''

    if (!destination) return
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(destination) ? destination : `https://${destination}`
    if (/^(javascript|data|file):/i.test(candidate)) return
    window.location.assign(candidate)
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
      setGallery(profile.partnerImageUrl ? [profile.partnerImageUrl] : [])
      savedMediaBlobRef.current = null
      clearDeviceMemory(account.id)
      void clearDeviceSession(account.id).then(() => setSavedSessionAvailable(false))
    } else {
      const sessionImages = gallery
      void Promise.all([loadPartnerGallery(account.id), loadFavoriteLook(account.id)]).then(([storedImages, look]) => {
        const imageUrls = [...new Set([...sessionImages, ...storedImages])].slice(0, 12)
        setGallery(imageUrls)
        if (look) {
          setFavoriteLook(look)
          setProfile((current) => ({
            ...current,
            figure: look.figure,
            partnerName: look.partnerName || current.partnerName,
            partnerImageUrl: current.partnerImageUrl || look.imageUrl,
          }))
        }
        return savePartnerGallery(account.id, imageUrls)
      }).catch(() => setImageNotice('Galleriet kunne ikke gemmes på denne enhed.'))
    }
  }

  function chooseNotificationStyle(style: NotificationStyle) {
    setProfile((current) => ({ ...current, notificationStyle: style }))
    if (account) saveNotificationStyle(account.id, style)
  }

  function choosePanicDestination(destination: PanicDestination) {
    setPanicDestination(destination)
    if (account) savePanicDestination(account.id, destination)
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
      plan: entitlement.plan,
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
    () => contentCatalog.fetishes.filter(
      (item) => item.enabled && !item.free && !profile.unlocked.includes(item.id),
    ),
    [contentCatalog.fetishes, profile.unlocked],
  )

  function push(...ls: Line[]) {
    setLines((prev) => [...prev, ...ls])
  }

  function startSession() {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    setBodyOpen(false)
    setBodyView('front')
    const fetishes = profile.fetishes.filter((id) => {
      const item = contentCatalog.fetishes.find((option) => option.id === id)
      return item?.enabled && (item.free || profile.unlocked.includes(id))
    })
    const p = { ...profile, fetishes }
    const scenes = availableScenes(sceneCatalog, p, contentCatalog)
    const scene = scenes.find((item) => item.id === p.sceneId) ?? scenes[0]
    if (scene) p.sceneId = scene.id
    setProfile(p)
    if (account) void saveChatName(account.id, p.chatName).catch(() => undefined)
    if (account) void savePartnerName(account.id, p.partnerName).catch(() => undefined)
    if (account && p.privacyMode === 'private') {
      void clearDeviceSession(account.id).then(() => setSavedSessionAvailable(false))
    }
    const dayKey = new Date().toISOString().slice(0, 10)
    const dailyPool = [
      'I dag: 20 langsomme ryk, så hænderne væk i et minut.',
      'I dag: lingeri på under tøjet hele aftenen.',
      'I dag: ingen orgasme før aftenen. Edge tre gange.',
      'I dag: send et billede når du er tæt på.',
      'I dag: plug eller trusser — du vælger, du beholder det på.',
    ]
    const daily = dailyPool[[...dayKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % dailyPool.length]
    const homework = frue.homework.trim()
    setLines([
      systemLine(scene ? scene.title : 'Scene start'),
      ...(homework ? [systemLine(`Lektie fra sidste session: ${homework}`)] : []),
      systemLine(`Dagens ordre: ${daily}`),
      aiLine(openingPromptForPlan(scene, p.plan, p.nsfw)),
    ])
    if (homework) setFrue((current) => ({ ...current, homework: '' }))
    setCycle(1)
    setNear('ok')
    setRunning(true)
    savedMediaBlobRef.current = null
    dropMedia()
    setPhase('session')
  }

  async function attachMedia(file: File) {
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
    if (kind === 'video' || !aiIsConfigured()) {
      push(youLine(kind === 'video' ? 'Viste et klip' : 'Viste et billede'), aiLine(onMedia(profile, kind)))
      return
    }

    const controller = new AbortController()
    aiRequestRef.current?.abort()
    aiRequestRef.current = controller
    setAiThinking(true)
    push(youLine('Viste et billede'))
    try {
      const reply = await analyzeImage({
        profile: aiProfile,
        near,
        cycle,
        partnerHeat,
        userHeat,
        lines,
        text: 'Se på billedet og reager naturligt i vores aktuelle samtale. Beskriv kun det, du tydeligt kan se.',
        file,
        signal: controller.signal,
      })
      push(aiLine(reply))
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Ukendt billedfejl'
      push(systemLine(`AI kunne ikke aflæse billedet: ${message}`))
      push(aiLine(onMedia(profile, 'image')))
    } finally {
      if (aiRequestRef.current === controller) aiRequestRef.current = null
      setAiThinking(false)
    }
  }

  async function createPartnerImage(replaceLockedLook = false) {
    if (imageBusy) return
    if (!aiIsConfigured()) {
      setImageNotice('Billed-AI er ikke konfigureret endnu.')
      return
    }
    if (imageGenerationsLeft < 1) {
      setImageNotice('Du har ingen figurbilleder tilbage på planen.')
      return
    }
    const controller = new AbortController()
    setImageBusy(true)
    setImageNotice('AI-partneren bliver skabt…')
    let identityClearFailed = false
    try {
      const imageUrl = await generatePartnerImage({
        profile: aiProfile,
        signal: controller.signal,
      })
      setProfile((current) => ({ ...current, partnerImageUrl: imageUrl }))
      if (replaceLockedLook) {
        setFavoriteLook(null)
        if (account && profile.privacyMode === 'device') {
          try {
            await clearFavoriteLook(account.id)
          } catch {
            identityClearFailed = true
          }
        }
      }
      const imageUrls = [imageUrl, ...gallery.filter((item) => item !== imageUrl)].slice(0, 12)
      setGallery(imageUrls)
      let gallerySaved = true
      if (account && profile.privacyMode === 'device') {
        try {
          await savePartnerGallery(account.id, imageUrls)
        } catch {
          gallerySaved = false
        }
      }
      setImageNotice(profile.privacyMode === 'device'
        ? gallerySaved
          ? replaceLockedLook
            ? identityClearFailed
              ? 'En ny partner er oprettet, men det tidligere faste udseende kunne ikke slettes fra enheden.'
              : 'En ny partner er oprettet. Vælg “Brug som fast udseende”, hvis den skal låses.'
            : 'Billedet er oprettet og gemmes kun på denne enhed.'
          : 'Billedet er oprettet, men galleriet kunne ikke gemmes på denne enhed.'
        : 'Billedet er oprettet og slettes, når den private session forlades.')
    } catch (error) {
      setImageNotice(error instanceof Error ? error.message : 'Billedet kunne ikke oprettes.')
    } finally {
      setImageBusy(false)
    }
  }

  async function createPartnerPose() {
    if (imageBusy || !favoriteLook) return
    if (!aiIsConfigured()) {
      setImageNotice('Billed-AI er ikke konfigureret endnu.')
      return
    }
    if (imageGenerationsLeft < 1) {
      setImageNotice('Du har ingen figurbilleder tilbage på planen.')
      return
    }
    const controller = new AbortController()
    setImageBusy(true)
    setImageNotice(`Laver en ny positur med samme ${partnerDisplayName(profile)}…`)
    try {
      const imageUrl = await generatePartnerPose({
        profile: aiProfile,
        referenceImageUrl: favoriteLook.imageUrl,
        signal: controller.signal,
      })
      const imageUrls = [imageUrl, ...gallery.filter((item) => item !== imageUrl)].slice(0, 12)
      const poseImages = [
        favoriteLook.imageUrl,
        ...[...new Set([...favoriteLook.poseImages, imageUrl])]
          .filter((item) => item !== favoriteLook.imageUrl)
          .slice(-3),
      ]
      const updatedLook: FavoriteLook = {
        ...favoriteLook,
        partnerName: profile.partnerName.trim() || favoriteLook.partnerName,
        poseImages,
        savedAt: new Date().toISOString(),
      }
      setProfile((current) => ({ ...current, partnerImageUrl: imageUrl }))
      setFavoriteLook(updatedLook)
      setGallery(imageUrls)
      if (account && profile.privacyMode === 'device') {
        await Promise.all([
          saveFavoriteLook(updatedLook),
          savePartnerGallery(account.id, imageUrls),
        ])
      }
      setImageNotice(
        profile.privacyMode === 'device'
          ? 'Ny positur er lavet med det faste partnerbillede som reference og gemt på denne enhed.'
          : 'Ny positur er lavet med det faste partnerbillede som reference og slettes med den private session.',
      )
    } catch (error) {
      setImageNotice(error instanceof Error ? error.message : 'Den nye positur kunne ikke oprettes.')
    } finally {
      setImageBusy(false)
    }
  }

  async function createChatImage() {
    if (imageBusy || aiThinking) return
    if (!aiIsConfigured()) {
      push(systemLine('Billed-AI er ikke konfigureret endnu.'))
      return
    }
    if (imageGenerationsLeft < 1) {
      push(systemLine('Du har ingen figurbilleder tilbage på planen.'))
      return
    }
    const controller = new AbortController()
    setImageBusy(true)
    setSessionMenuOpen(false)
    try {
      const imageUrl = favoriteLook
        ? await generatePartnerPose({
            profile: aiProfile,
            referenceImageUrl: favoriteLook.imageUrl,
            signal: controller.signal,
          })
        : await generatePartnerImage({
            profile: aiProfile,
            signal: controller.signal,
          })
      setProfile((current) => ({ ...current, partnerImageUrl: imageUrl }))
      const imageUrls = [imageUrl, ...gallery.filter((item) => item !== imageUrl)].slice(0, 12)
      setGallery(imageUrls)
      if (favoriteLook) {
        const updatedLook = {
          ...favoriteLook,
          poseImages: [...new Set([...favoriteLook.poseImages, imageUrl])].slice(-4),
          savedAt: new Date().toISOString(),
        }
        setFavoriteLook(updatedLook)
        if (account && profile.privacyMode === 'device') await saveFavoriteLook(updatedLook)
      }
      if (account && profile.privacyMode === 'device') await savePartnerGallery(account.id, imageUrls)
      push({ ...aiLine(`${partnerDisplayName(profile)} sender dig et nyt billede.`), imageUrl })
    } catch (error) {
      push(systemLine(error instanceof Error ? `Billedet kunne ikke laves: ${error.message}` : 'Billedet kunne ikke laves.'))
    } finally {
      setImageBusy(false)
    }
  }

  async function saveCurrentLook() {
    if (!account || !profile.partnerImageUrl || favoriteBusy) return
    setFavoriteBusy(true)
    const look: FavoriteLook = {
      userId: account.id,
      imageUrl: profile.partnerImageUrl,
      figure: profile.figure,
      partnerName: partnerDisplayName(profile),
      poseImages: [profile.partnerImageUrl],
      savedAt: new Date().toISOString(),
    }
    try {
      if (profile.privacyMode === 'device') await saveFavoriteLook(look)
      setFavoriteLook(look)
      setImageNotice(profile.privacyMode === 'device'
        ? 'Partnerens udseende er låst på denne enhed. Nye positurer bruger billedet som reference.'
        : 'Udseendet er låst i denne private session og slettes, når sessionen forlades.')
    } catch {
      setImageNotice('Det faste udseende kunne ikke gemmes.')
    } finally {
      setFavoriteBusy(false)
    }
  }

  function useFavoriteLook() {
    if (!favoriteLook) return
    setProfile((current) => ({
      ...current,
      figure: favoriteLook.figure,
      partnerName: favoriteLook.partnerName || current.partnerName,
      partnerImageUrl: favoriteLook.imageUrl,
    }))
    setImageNotice('Din gemte favorit bruges igen uden billedforbrug.')
  }

  async function dropFavoriteLook() {
    if (!account || favoriteBusy) return
    setFavoriteBusy(true)
    try {
      if (profile.privacyMode === 'device') await clearFavoriteLook(account.id)
      setFavoriteLook(null)
      setImageNotice(profile.privacyMode === 'device'
        ? 'Det faste udseende er slettet fra denne enhed. Det viste billede bliver stående i sessionen.'
        : 'Det faste udseende er fjernet fra den private session.')
    } catch {
      setImageNotice('Det faste udseende kunne ikke fjernes.')
    } finally {
      setFavoriteBusy(false)
    }
  }


  async function saveImageToDevice(url?: string, filename = 'stay-billede.png') {
    if (!url) {
      setSaveNotice('Der er ikke et billede at gemme endnu.')
      setImageNotice('Der er ikke et billede at gemme endnu.')
      return
    }
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const type = blob.type || 'image/png'
      const file = new File([blob], filename, { type })
      const shareNav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
      if (navigator.share && shareNav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename })
        setSaveNotice('Billedet er sendt til gem/del på telefonen.')
        setImageNotice('Billedet er sendt til gem/del på telefonen.')
        return
      }
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(href), 1500)
      setSaveNotice('Billedet er downloadet.')
      setImageNotice('Billedet er downloadet.')
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
      setSaveNotice('Åbnede billedet. Hold inde for at gemme, hvis download ikke virker.')
      setImageNotice('Åbnede billedet. Hold inde for at gemme, hvis download ikke virker.')
    }
  }


  useEffect(() => {
    if (partnerHeat < 80) {
      partnerPeakRef.current = false
      moanLockRef.current = false
      return
    }
    if (soundOn && partnerHeat < 100 && !moanLockRef.current) {
      moanLockRef.current = true
      playStaySound('moan', soundContextRef.current || undefined)
    }
    if (partnerHeat >= 100 && !partnerPeakRef.current) {
      partnerPeakRef.current = true
      const line = profile.figure === 'mistress'
        ? 'Ahh — jeg kommer. Fissen trækker sig sammen om ingenting. Vent. Så tager vi en runde mere.'
        : 'Ahh — jeg kommer. Pikken pulserer. Sprøjt. Vent. Så tager vi en runde mere.'
      push(aiLine(line))
      setPartnerHeat(18)
      setCycle((current) => current + 1)
      if (soundOn) playStaySound('come', soundContextRef.current || undefined)
    }
  }, [partnerHeat, soundOn, profile.figure])

  useEffect(() => () => {
    const context = soundContextRef.current
    soundContextRef.current = null
    if (context && context.state !== 'closed') void context.close()
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setPartnerHeat((heat) => {
        let delta = running ? 0 : -1
        if (near === 'close') delta += 1
        if (near === 'too_much') delta = -4
        return Math.max(0, Math.min(100, heat + delta))
      })
    }, 1800)
    return () => window.clearInterval(id)
  }, [running, near])


  useEffect(() => {
    if (edgeMode === 'idle') return
    const id = window.setInterval(() => {
      setEdgeLeft((seconds) => {
        if (seconds <= 1) {
          setEdgeMode('idle')
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [edgeMode])

  useEffect(() => {
    if (strokeLeft <= 0) return
    const id = window.setInterval(() => {
      setStrokeLeft((count) => Math.max(0, count - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [strokeLeft])

  function tickSession(kind: 'close' | 'ok' | 'too' | 'deny' | 'finish' | 'safe') {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    if (kind === 'safe') {
      rememberCurrentScene()
      setBodyOpen(false)
      setStageOpen(false)
      setRunning(false)
      setAftercareReason('safeword')
      setPartnerHeat(0)
      setUserHeat(0)
      push(youLine(profile.limits.safeword), aiLine(onSafeword()), systemLine('Kom ned'))
      dropMedia()
      setPhase('aftercare')
      return
    }
    if (kind === 'close') {
      setNear('close')
      setRunning(false)
      setPartnerHeat((h) => Math.min(100, h + 8))
      setUserHeat((h) => Math.min(100, h + 10))
      push(youLine('Næsten'), aiLine(onClose(profile)))
      return
    }
    if (kind === 'too') {
      setBodyOpen(false)
      setNear('too_much')
      setRunning(false)
      setPartnerHeat((h) => Math.max(0, h - 12))
      setUserHeat((h) => Math.max(0, h - 8))
      push(youLine('For meget'), aiLine(onTooMuch(profile)))
      return
    }
    if (kind === 'ok') {
      setNear('ok')
      setCycle((c) => c + 1)
      setRunning(true)
      setPartnerHeat((h) => Math.min(100, h + 6))
      push(youLine('Ok — igen'), aiLine(onOk(profile, cycle + 1)))
      return
    }
    if (kind === 'deny') {
      setRunning(false)
      setPartnerHeat((h) => Math.max(0, h - 10))
      push(youLine('Må jeg?'), aiLine(onDeny(profile)))
      return
    }
    setRunning(false)
    setBodyOpen(false)
    setAftercareReason('finish')
    rememberCurrentScene()
    push(youLine('Finish'), aiLine(onFinish(profile)))
    dropMedia()
    setPhase('aftercare')
  }

  function rememberCurrentScene() {
    const summary = lines
      .filter((line) => line.from !== 'system')
      .slice(-6)
      .map((line) => `${line.from === 'you' ? 'Dig' : 'AI'}: ${line.text}`)
      .join(' · ')
      .slice(0, 400)
    if (summary) setProfile((current) => ({ ...current, lastMemory: summary }))
  }

  async function sendAiRequest(
    text: string,
    intent: 'chat' | 'task' | 'touch' | 'close' | 'climax',
    visibleText = text,
    touchZone?: BodyZoneId,
  ): Promise<string | undefined> {
    if (!text || aiThinking) return
    if (!aiIsConfigured()) {
      const localReply = intent === 'task'
        ? 'Opgaveknappen kræver, at AI-chatten er aktiv.'
        : intent === 'touch'
          ? 'Kropsfunktionen kræver, at AI-chatten er aktiv.'
          : intent === 'close'
            ? localCloseReply(profile)
            : intent === 'climax'
              ? localClimaxReply(profile)
              : replyToText(profile, text, near)
      push(
        youLine(visibleText),
        aiLine(localReply),
      )
      return localReply
    }

    const controller = new AbortController()
    aiRequestRef.current = controller
    setAiThinking(true)
    push(youLine(visibleText))
    try {
      const reply = await askAi({
        profile: aiProfile,
        near,
        cycle,
        partnerHeat,
        userHeat,
        lines,
        text,
        intent,
        touchZone,
        signal: controller.signal,
      })
      push(aiLine(reply))
      return reply
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Ukendt AI-fejl'
      push(systemLine(`AI kunne ikke svare: ${message}`))
      const fallbackReply = intent === 'chat'
        ? replyToText(profile, text, near)
        : intent === 'close'
          ? localCloseReply(profile)
          : intent === 'climax'
            ? localClimaxReply(profile)
            : undefined
      if (fallbackReply) push(aiLine(fallbackReply))
      return fallbackReply
    } finally {
      if (aiRequestRef.current === controller) aiRequestRef.current = null
      setAiThinking(false)
    }
  }

  useEffect(() => {
    notificationAiRequestRef.current = sendAiRequest
  })

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
    await sendAiRequest(t, 'chat')
  }

  async function requestTask() {
    const task = await sendAiRequest(
      'Giv mig én konkret opgave, der fortsætter vores aktuelle samtale og passer til mine valg, grænser og mit udstyr.',
      'task',
      'Giv mig en opgave',
    )
    if (task) setActiveTask(task)
  }

  async function completeTask() {
    const task = activeTask.trim()
    if (!task || aiThinking) return
    setActiveTask('')
    await sendAiRequest(
      `Jeg har udført opgaven: ${task}. Bekræft det kort i rollen og sig, hvad der sker nu.`,
      'chat',
      'Opgave udført',
    )
  }

  async function failTask() {
    const task = activeTask.trim()
    if (!task || aiThinking) return
    setActiveTask('')
    await sendAiRequest(
      `Jeg fuldførte ikke opgaven: ${task}. Reager kort i rollen uden at antage hvorfor, respekter mine grænser, og sig hvad der sker nu.`,
      'chat',
      'Ikke fuldført',
    )
  }

  async function sendTaskPhoto(file: File) {
    const task = activeTask.trim()
    if (!task || aiThinking) return
    dropMedia()
    const url = URL.createObjectURL(file)
    savedMediaBlobRef.current = file
    setMedia({ url, kind: 'image', blob: file })
    setActiveTask('')
    push(youLine(`Viste foto for opgaven: ${task}`))
    if (!aiIsConfigured()) {
      push(aiLine('Godt. Jeg kan se, at du har gjort det.'))
      return
    }
    setAiThinking(true)
    try {
      const reply = await analyzeImage({
        profile: aiProfile,
        near,
        cycle,
        partnerHeat,
        userHeat,
        lines,
        text: `Brugeren siger, at opgaven er udført: ${task}. Se billedet og bekræft kort i rollen. Beskriv kun det, du tydeligt kan se.`,
        file,
      })
      push(aiLine(reply))
    } catch (error) {
      push(systemLine(error instanceof Error ? `Fotoet kunne ikke læses: ${error.message}` : 'Fotoet kunne ikke læses.'))
    } finally {
      setAiThinking(false)
    }
  }

  async function requestInspection() {
    const worn = [...(profile.lingerieUser || []), ...profile.equipment].slice(0, 8).join(', ') || 'det du har på'
    await sendAiRequest(
      `Inspicer mig. Jeg har på: ${worn}. Sig hvad der skal rettes og hvad der må blive.`,
      'task',
      'Inspektion',
    )
  }

  async function requestProtocol() {
    await sendAiRequest('Protocol. Jeg knæler og venter. Giv titel og næste ordre.', 'task', 'Protocol')
  }

  async function requestKegel(kind: 'kegel' | 'reverse') {
    const text = kind === 'reverse'
      ? 'Reverse kegel. Sig hvor mange sekunder jeg skal afspænde eller skubbe blidt ud, og hvornår jeg slipper. Ingen lægeråd og ingen smerte-guide.'
      : 'Almindelig kegel. Sig hvor længe jeg skal knibe, hvor mange gentagelser, og hvornår jeg må slippe.'
    await sendAiRequest(text, 'task', kind === 'reverse' ? 'Reverse kegel' : 'Kegel')
  }

  async function requestScenePermission(kind: 'touch' | 'climax' | 'swallow') {
    if (kind === 'climax') {
      const blocked = lockBlocksClimax(frue)
      await sendAiRequest(
        blocked
          ? `Må jeg komme? Den aktive lås siger: ${blocked} Giv et kort nej og én regel.`
          : 'Må jeg komme? Svar kort ja eller nej og giv én regel. Bed om min status fra 1 til 10.',
        'close',
        'Må jeg komme',
      )
      return
    }
    await sendAiRequest(
      kind === 'touch'
        ? 'Må jeg røre mig? Svar kort ja eller nej og giv præcis én regel.'
        : 'Må jeg sluge? Tillad det kun, hvis det er aftalt og indholdet er friskt; ellers sig at det skal kasseres.',
      'chat',
      kind === 'touch' ? 'Må jeg røre' : 'Må jeg sluge',
    )
  }

  async function requestPlugChange() {
    await sendAiRequest(
      `Skift plug. Aktuel status er ${statusLine(frue.status)}. Giv én instruktion: mindre, større eller ud. Stop ved smerte eller følelsesløshed.`,
      'task',
      'Skift plug',
    )
  }

  async function stopEstim() {
    setFrue((current) => ({ ...current, status: { ...current.status, estim: '0' } }))
    await sendAiRequest('E-stim er slukket som sikkerhedsstop. Bekræft kort uden DIY-råd.', 'chat', 'Sluk e-stim')
  }

  async function reportSwallowed() {
    setFrue((current) => ({ ...current, lastOrgasmAt: new Date().toISOString() }))
    await sendAiRequest(
      'Jeg er kommet og har slugt som aftalt. Bekræft kort og vælg enten en ny udløsningslås eller rolig aftercare.',
      'climax',
      'Kommet + slugt',
    )
  }

  async function sendRuinedMoment() {
    if (aiThinking) return
    setNear('close')
    setRunning(false)
    setUserHeat(70)
    await sendAiRequest('Ruined. Jeg må ikke komme færdigt. Tag det fra mig på kanten.', 'close', 'Ruined')
  }

  async function touchBodyZone(zone: BodyZone) {
    if (aiThinking) return
    const visible = touchUserLine(zone)
    setBodyOpen(false)
    const effectiveNsfw = profile.plan !== 'free' && profile.nsfw
    if (!aiIsConfigured()) {
      push(
        youLine(visible),
        aiLine(localTouchReply(
          zone.id,
          profile.figure,
          effectiveNsfw,
          profile.fetishes.includes('anal'),
        )),
      )
      return
    }
    setPartnerHeat((h) => Math.min(100, h + 7))
    if (profile.playMode === 'mutual') setUserHeat((h) => Math.min(100, h + 4))
    await sendAiRequest(visible, 'touch', visible, zone.id)
  }

  async function sendCloseMoment() {
    if (aiThinking) return
    setNear('close')
    setRunning(false)
    setFrue((current) => current.lock === 'edges' && current.lockEdges > 0
      ? { ...current, lockEdges: current.lockEdges - 1 }
      : current)
    await sendAiRequest('Jeg er tæt på', 'close', 'Jeg er tæt på')
  }

  async function sendClimaxMoment() {
    if (aiThinking) return
    const blocked = lockBlocksClimax(frue)
    if (blocked) {
      push(systemLine(blocked))
      await sendAiRequest(`Jeg vil komme, men låsen siger: ${blocked}`, 'close', 'Låst udløsning')
      return
    }
    setNear('close')
    setRunning(false)
    setUserHeat(100)
    setPartnerHeat((h) => Math.min(100, profile.playMode === 'mutual' ? 100 : h + 18))
    setFrue((current) => ({ ...current, lastOrgasmAt: new Date().toISOString() }))
    await sendAiRequest('Jeg kommer nu', 'climax', 'Jeg kommer')
  }

  function unlock(id: FetishId) {
    setProfile((p) => ({
      ...p,
      unlocked: p.unlocked.includes(id) ? p.unlocked : [...p.unlocked, id],
    }))
  }

  function toggleFetish(id: FetishId) {
    const item = contentCatalog.fetishes.find((option) => option.id === id)
    if (!item?.enabled) return
    if (!item.free && !profile.unlocked.includes(id)) {
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

  const activeUsageLimits = limitsForPlan(usageConfig, entitlement.plan)
  const activeBonusGenerations = entitlement.bonusPeriod === currentUsagePeriod()
    ? entitlement.bonusImageGenerations
    : 0
  const activeBonusAnalyses = entitlement.bonusPeriod === currentUsagePeriod()
    ? entitlement.bonusImageAnalyses
    : 0
  const imageAnalysesLeft = Math.max(
    0,
    activeUsageLimits.imageAnalysesMonthly + activeBonusAnalyses - usage.imageAnalyses,
  )
  const imageGenerationsLeft = Math.max(
    0,
    activeUsageLimits.imageGenerationsMonthly + activeBonusGenerations - usage.imageGenerations,
  )
  const chatMessagesLeft = Math.max(0, activeUsageLimits.chatDaily - usage.chatToday)

  if (phase === 'login') {
    return (
      <LoginScreen
        onIn={(acc) => {
          setAccount(acc)
          setEntitlementLoaded(false)
          setPhase('home')
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
          setPhase(acc ? 'home' : 'login')
        }}
      />
    )
  }

  const expired = entitlementIsExpired(entitlement)
  const accountBlocked = Boolean(
    account &&
    account.role !== 'admin' &&
    entitlementLoaded &&
    (entitlement.status !== 'active' || expired),
  )

  if (accountBlocked && phase !== 'pay' && phase !== 'age' && phase !== 'rules') {
    const title = expired
      ? 'Dit abonnement er udløbet'
      : entitlement.status === 'paused'
        ? 'Din konto er sat på pause'
        : 'Din konto er ikke aktiv'
    return (
      <main className="shell account-locked">
        <p className="kicker">Konto</p>
        <h1>{title}</h1>
        <p className="lede">
          AI-chat, billedgenerering og billedanalyse er stoppet centralt. Det kan ikke ændres fra denne telefon.
        </p>
        {entitlement.expiresAt && (
          <p className="hint">Registreret udløb: {new Date(entitlement.expiresAt).toLocaleString('da-DK')}</p>
        )}
        <div className="row">
          {(expired || entitlement.status === 'cancelled' || entitlement.status === 'churned') && (
            <button className="primary" onClick={() => setPhase('pay')}>Se abonnement</button>
          )}
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
      </main>
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
            setPhase(returnPhase === 'decoy' ? 'home' : returnPhase)
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
          Forbruget håndhæves centralt. Betaling er endnu manuel: et køb sendes til admin til godkendelse.
        </p>
        <section className="usage-card">
          <h2>Dit forbrug</h2>
          <div><strong>{usage.chatToday} / {activeUsageLimits.chatDaily}</strong><span>chat i dag</span></div>
          <div><strong>{usage.imageGenerations} / {usage.imageGenerations + imageGenerationsLeft}</strong><span>genererede billeder denne måned</span></div>
          <div><strong>{usage.imageAnalyses} / {usage.imageAnalyses + imageAnalysesLeft}</strong><span>billedanalyser denne måned</span></div>
        </section>
        {purchaseNotice && <p className="form-message success">{purchaseNotice}</p>}
        {PLANS.map((plan) => (
          <section key={plan.id} className="sheet" style={{ marginTop: '0.75rem' }}>
            <h2 style={{ marginTop: 0 }}>
              {plan.title} — {plan.dkkMonth} kr/md
            </h2>
            <p className="lede">{plan.blurb}</p>
            <p className="hint">
              Op til {limitsForPlan(usageConfig, plan.id).chatDaily} chatbeskeder/dag ·{' '}
              {limitsForPlan(usageConfig, plan.id).imageGenerationsMonthly} billeder ·{' '}
              {limitsForPlan(usageConfig, plan.id).imageAnalysesMonthly} billedanalyser/md ·{' '}
              {plan.nsfw ? 'NSFW' : 'ikke NSFW'} ·{' '}
              {plan.packs ? 'alle pakker' : 'kun kerne'}
            </p>
            <button
              className={profile.plan === plan.id ? 'chip on' : 'primary'}
              disabled={profile.plan === plan.id || plan.id === 'free'}
              onClick={async () => {
                if (!account) return
                try {
                  await requestPlanPurchase(account.id, account.email, plan.id)
                  setPurchaseNotice(`Din bestilling af ${plan.title} er sendt til admin.`)
                } catch (error) {
                  setPurchaseNotice(error instanceof Error ? error.message : 'Bestillingen kunne ikke sendes.')
                }
              }}
            >
              {profile.plan === plan.id ? 'Aktiv plan' : plan.id === 'free' ? 'Gratis plan' : 'Bestil'}
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
              onClick={async () => {
                if (!account) return
                try {
                  await requestAddonPurchase(account.id, account.email, a.id)
                  setPurchaseNotice(`${a.title} er sendt til admin til godkendelse.`)
                } catch (error) {
                  setPurchaseNotice(error instanceof Error ? error.message : 'Tilkøbet kunne ikke sendes.')
                }
              }}
            >
              Bestil
            </button>
          </div>
        ))}
        <button className="ghost" style={{ marginTop: '1rem' }} onClick={() => setPhase('home')}>
          Tilbage
        </button>
      </main>
    )
  }

  if (phase === 'home') {
    const scenes = availableScenes(sceneCatalog, profile, contentCatalog)
    const selectedScene = scenes.find((scene) => scene.id === profile.sceneId) ?? scenes[0]
    const currentPlan = PLANS.find((item) => item.id === entitlement.plan) ?? PLANS[0]
    const partnerTitle = partnerDisplayName(profile)
    const personalityTitle = profile.personality === 'warm'
      ? 'Blid'
      : profile.personality === 'cold'
        ? 'Kold'
        : profile.personality === 'tease'
          ? 'Drilsk'
          : 'Dominerende'
    return (
      <main className="shell home-page">
        <header className="home-header">
          <div>
            <p className="kicker">Min Stay</p>
            <h1>{profile.chatName.trim() ? `Hej ${profile.chatName.trim()}` : 'Klar når du er'}</h1>
            <p className="lede">Start hurtigt med dine vigtigste valg. Resten kan tilpasses, når du har lyst.</p>
          </div>
          <button type="button" className="panic-home" onClick={panic}>Noter</button>
        </header>

        <section className="account-overview" aria-labelledby="account-overview-title">
          <div className="account-overview-head">
            <div>
              <span className="status-dot" />
              <span id="account-overview-title">Konto aktiv</span>
            </div>
            <button type="button" onClick={() => setPhase('pay')}>{currentPlan.title}</button>
          </div>
          <div className="account-metrics">
            <div><strong>{chatMessagesLeft}</strong><span>beskeder i dag</span></div>
            <div><strong>{imageGenerationsLeft}</strong><span>billeder tilbage</span></div>
            <div><strong>{imageAnalysesLeft}</strong><span>analyser tilbage</span></div>
            <div><strong>{currentPlan.nsfw && profile.nsfw ? 'Til' : 'Fra'}</strong><span>NSFW</span></div>
          </div>
          {entitlement.expiresAt && (
            <p className="account-expiry">Planen udløber {new Date(entitlement.expiresAt).toLocaleDateString('da-DK')}.</p>
          )}
        </section>

        {savedSessionAvailable && profile.privacyMode === 'device' && (
          <section className="resume-card">
            <div>
              <strong>Fortsæt hvor du slap</strong>
              <span>Din seneste lokalt gemte scene er klar.</span>
            </div>
            <button type="button" className="primary" onClick={() => void resumeSavedSession()}>Fortsæt chat</button>
          </section>
        )}

        <section className="quick-start" aria-labelledby="quick-start-title">
          <div className="quick-start-heading">
            <div>
              <p className="kicker">Hurtig start</p>
              <h2 id="quick-start-title">Vælg kun det vigtigste</h2>
            </div>
            {profile.partnerImageUrl ? (
              <img src={profile.partnerImageUrl} alt={`Din AI-partner ${partnerTitle}`} />
            ) : (
              <span className="quick-partner-placeholder" aria-hidden="true">{partnerTitle.slice(0, 1)}</span>
            )}
          </div>

          <label className="field home-chat-name">
            <span>Dit chatnavn</span>
            <input
              value={profile.chatName}
              maxLength={32}
              autoComplete="nickname"
              placeholder="Hvad skal din AI-partner kalde dig?"
              onChange={(event) => setProfile({ ...profile, chatName: event.target.value })}
              onBlur={() => {
                if (account) void saveChatName(account.id, profile.chatName).catch(() => undefined)
              }}
            />
          </label>

          <div className="quick-choice">
            <div className="quick-choice-label"><strong>Scene</strong><span>{selectedScene?.title}</span></div>
            <div className="quick-scroll" role="group" aria-label="Vælg scene">
              {scenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className={selectedScene?.id === scene.id ? 'quick-option on' : 'quick-option'}
                  onClick={() => setProfile({ ...profile, sceneId: scene.id })}
                >
                  <strong>{scene.title}</strong>
                  <span>{scene.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="quick-choice compact">
            <div className="quick-choice-label"><strong>Din rolle</strong></div>
            <div className="row">
              {(['slave', 'domme'] as Role[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  className={profile.role === role ? 'chip on' : 'chip'}
                  onClick={() => setProfile({ ...profile, role })}
                >
                  {role === 'domme' ? 'Jeg styrer' : 'Jeg adlyder'}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-choice compact">
            <div className="quick-choice-label"><strong>AI-partner</strong><span>{partnerTitle}</span></div>
            <div className="row">
              {(['mistress', 'master'] as Figure[]).map((figure) => (
                <button
                  key={figure}
                  type="button"
                  className={profile.figure === figure ? 'chip on' : 'chip'}
                  onClick={() => setProfile({ ...profile, figure })}
                >
                  {figure === 'mistress' ? 'Mistress' : 'Master'}
                </button>
              ))}
            </div>
            <label className="field inline-partner-name">
              <span>Partnerens navn</span>
              <input
                value={profile.partnerName}
                maxLength={32}
                autoComplete="off"
                placeholder={profile.figure === 'mistress' ? 'Fx Freja' : 'Fx Alexander'}
                onChange={(event) => setProfile({ ...profile, partnerName: event.target.value })}
                onBlur={() => {
                  if (account) void savePartnerName(account.id, profile.partnerName).catch(() => undefined)
                }}
              />
            </label>
          </div>

          <div className="quick-choice compact">
            <div className="quick-choice-label"><strong>Grundstil</strong><span>{personalityTitle}</span></div>
            <div className="row">
              {(['warm', 'cold', 'tease', 'strict'] as Personality[]).map((personality) => (
                <button
                  key={personality}
                  type="button"
                  className={profile.personality === personality ? 'chip on' : 'chip'}
                  onClick={() => setProfile({ ...profile, personality })}
                >
                  {personality === 'warm' ? 'Blid' : personality === 'cold' ? 'Kold' : personality === 'tease' ? 'Drilsk' : 'Dominerende'}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-choice compact">
            <div className="quick-choice-label">
              <strong>Gemning</strong>
              <span>{profile.privacyMode === 'private' ? 'Privat session' : 'Denne enhed'}</span>
            </div>
            <div className="row">
              <button
                type="button"
                className={profile.privacyMode === 'private' ? 'chip on' : 'chip'}
                onClick={() => choosePrivacyMode('private')}
              >
                Privat
              </button>
              <button
                type="button"
                className={profile.privacyMode === 'device' ? 'chip on' : 'chip'}
                onClick={() => choosePrivacyMode('device')}
              >
                Gem på enheden
              </button>
            </div>
          </div>

          <div className="quick-choice compact nsfw-quick-choice">
            <div className="quick-choice-label">
              <strong>NSFW</strong>
              <span>{currentPlan.nsfw ? (profile.nsfw ? 'Fræk er slået til' : 'Tøjet er på') : 'Kræver Solo eller Plus'}</span>
            </div>
            <button
              type="button"
              className={currentPlan.nsfw && profile.nsfw ? 'switch-button on' : 'switch-button'}
              disabled={!currentPlan.nsfw}
              aria-pressed={currentPlan.nsfw && profile.nsfw}
              onClick={() => currentPlan.nsfw && setProfile({
                ...profile,
                nsfw: !profile.nsfw,
                look: !profile.nsfw ? 'nsfw' : 'clothed',
              })}
            >
              <span />
              {currentPlan.nsfw && profile.nsfw ? 'Til' : 'Fra'}
            </button>
          </div>

          <div className="quick-summary">
            <span>{selectedScene?.title || 'Scene'}</span>
            <span>{partnerTitle}</span>
            <span>{personalityTitle}</span>
            <span>{profile.privacyMode === 'private' ? 'Privat' : 'Lokal gemning'}</span>
          </div>

          <button type="button" className="primary quick-start-button" onClick={startSession}>Start chat</button>
          <button type="button" className="ghost customize-button" onClick={() => setPhase('setup')}>
            Tilpas partner og scene mere
          </button>
          <p className="quick-note">Krop, udseende, billede, intensitet, udstyr, temaer, ordlister, notifikationer og panikvalg ligger under Tilpas.</p>
        </section>

        <nav className="home-footer-actions" aria-label="Konto og indstillinger">
          <button type="button" onClick={() => setPhase('pay')}>Abonnement</button>
          <button type="button" onClick={() => openRules('home')}>Regler</button>
          {account?.role === 'admin' && <button type="button" onClick={() => setPhase('admin')}>Admin</button>}
          <button
            type="button"
            onClick={() => {
              logout()
              setAccount(null)
              setPhase('login')
            }}
          >
            Log ud
          </button>
        </nav>
      </main>
    )
  }

  if (phase === 'setup') {
    const scenes = availableScenes(sceneCatalog, profile, contentCatalog)
    const selectedScene = scenes.find((scene) => scene.id === profile.sceneId) ?? scenes[0]
    const currentPlan = PLANS.find((item) => item.id === entitlement.plan) ?? PLANS[0]
    return (
      <main className="shell">
        <p className="kicker">Tilpas partner</p>
        <div className="row">
          <button className="ghost" onClick={() => setPhase('home')}>
            Startside
          </button>
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
        <h1>Tilpas alle valg</h1>
        <p className="lede">
          Her finder du hele opsætningen. Dine valg bruges næste gang, du starter eller fortsætter en chat.
        </p>

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

        <section className="notification-choice" aria-labelledby="notification-style-title">
          <div>
            <h2 id="notification-style-title">Hvordan må opgavebeskeder se ud?</h2>
            <p className="hint">Valget bruges, når mobilpåmindelser bliver slået til.</p>
          </div>
          <label className={profile.notificationStyle === 'discreet' ? 'privacy-option on' : 'privacy-option'}>
            <input
              type="radio"
              name="notification-style"
              checked={profile.notificationStyle === 'discreet'}
              onChange={() => chooseNotificationStyle('discreet')}
            />
            <span>
              <strong>Diskret</strong>
              <small>Eksempel: “Stay · Din næste opgave er klar.”</small>
            </span>
          </label>
          <label className={profile.notificationStyle === 'explicit' ? 'privacy-option on' : 'privacy-option'}>
            <input
              type="radio"
              name="notification-style"
              checked={profile.notificationStyle === 'explicit'}
              onChange={() => chooseNotificationStyle('explicit')}
            />
            <span>
              <strong>Detaljeret / fræk</strong>
              <small>Påmindelsen må vise opgavens konkrete tekst på låseskærmen.</small>
            </span>
          </label>
          {profile.notificationStyle === 'explicit' && (
            <div className="notification-preview" role="alert">
              <strong>Kan ses af andre på din låseskærm</strong>
              <span>Eksempel: “Mistress: Din næste opgave er klar — gå et privat sted og gør dig klar.”</span>
            </div>
          )}
          <p className="privacy-note">Valget slås aldrig til automatisk. Du godkender også hver påmindelse, før den planlægges.</p>
        </section>

        <details className="setup-fold task-plan-settings">
          <summary>
            <span className="setup-fold-title">
              <strong>Opgaver i løbet af dagen</strong>
              <small>Vælg type, rytme og antal beskeder</small>
            </span>
            <span className="setup-fold-count">{taskPlan.count} stk.</span>
          </summary>
          <div className="setup-fold-content task-plan-grid">
            <div className="field task-category-field">
              <span>Typer opgaver — vælg gerne flere</span>
              <div className="task-category-options" role="group" aria-label="Vælg typer opgaver">
                {activeTaskCategories.map((category) => {
                  const selected = taskPlan.categories.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      className={selected ? 'on' : ''}
                      aria-pressed={selected}
                      onClick={() => setTaskPlan((current) => {
                        if (category === 'mix') return { ...current, category: 'mix', categories: ['mix'] }
                        const withoutMix = current.categories.filter((entry) => entry !== 'mix')
                        const next = withoutMix.includes(category)
                          ? withoutMix.filter((entry) => entry !== category)
                          : [...withoutMix, category]
                        const categories = next.length ? next : ['mix' as TaskCategory]
                        return { ...current, category: categories[0], categories }
                      })}
                    >{taskCategoryLabel(category)}</button>
                  )
                })}
              </div>
            </div>
            <label className="field">
              <span>Interval i minutter</span>
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={360}
                value={taskPlan.intervalMin}
                onChange={(event) => setTaskPlan((current) => ({
                  ...current,
                  intervalMin: Math.max(5, Math.min(360, Number(event.target.value) || 5)),
                }))}
              />
            </label>
            <label className="field">
              <span>Antal beskeder</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={24}
                value={taskPlan.count}
                onChange={(event) => setTaskPlan((current) => ({
                  ...current,
                  count: Math.max(1, Math.min(24, Number(event.target.value) || 1)),
                }))}
              />
            </label>
            <div className="notification-choice task-mode" role="group" aria-label="Tidspunkt for opgaver">
              <label className={taskPlan.mode === 'random' ? 'privacy-option on' : 'privacy-option'}>
                <input
                  type="radio"
                  name="task-mode"
                  checked={taskPlan.mode === 'random'}
                  onChange={() => setTaskPlan((current) => ({ ...current, mode: 'random' }))}
                />
                <span><strong>Tilfældigt</strong><small>Varierer lidt omkring intervallet.</small></span>
              </label>
              <label className={taskPlan.mode === 'fixed' ? 'privacy-option on' : 'privacy-option'}>
                <input
                  type="radio"
                  name="task-mode"
                  checked={taskPlan.mode === 'fixed'}
                  onChange={() => setTaskPlan((current) => ({ ...current, mode: 'fixed' }))}
                />
                <span><strong>Fast interval</strong><small>Sendes med den valgte afstand.</small></span>
              </label>
            </div>
            <p className="privacy-note">Opgaverne sendes først, når du selv slår “Til rådighed” til i chatten.</p>
            <p className="privacy-note">
              E-stim gælder kun færdigt legetøj på lavt niveau — aldrig hoved, hals, bryst, beskadiget hud eller personer med elektroniske implantater. Diskrete opgaver må aldrig udføres foran andre.
            </p>
            <section className="task-text-editor" aria-labelledby="task-list-heading">
              <div className="task-editor-heading">
                <div>
                  <strong id="task-list-heading">Opgaveliste</strong>
                  <small>Tilføj, ret eller slet dine egne opgaver.</small>
                </div>
                <span>{(taskBank[taskEditorCategory] || []).length} stk.</span>
              </div>
              <div className="task-editor-tabs" role="group" aria-label="Kategori som skal redigeres">
                {activeTaskCategories.filter((category) => category !== 'mix').map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={taskEditorCategory === category ? 'on' : ''}
                    aria-pressed={taskEditorCategory === category}
                    onClick={() => setTaskEditorCategory(category)}
                  >{taskCategoryLabel(category)}</button>
                ))}
              </div>
              <div className="task-text-list">
                {(taskBank[taskEditorCategory] || []).map((line, index) => (
                  <div className="task-text-row" key={`${taskEditorCategory}-${index}`}>
                    <label className="field">
                      <span>Opgave {index + 1}</span>
                      <input
                        value={line}
                        maxLength={180}
                        onChange={(event) => setTaskBank((current) => ({
                          ...current,
                          [taskEditorCategory]: (current[taskEditorCategory] || []).map((entry, entryIndex) => (
                            entryIndex === index ? event.target.value : entry
                          )),
                        }))}
                      />
                    </label>
                    <button
                      type="button"
                      className="danger task-delete-button"
                      aria-label={`Slet opgave ${index + 1}`}
                      onClick={() => setTaskBank((current) => ({
                        ...current,
                        [taskEditorCategory]: (current[taskEditorCategory] || []).filter((_, entryIndex) => entryIndex !== index),
                      }))}
                    >Slet</button>
                  </div>
                ))}
                {!(taskBank[taskEditorCategory] || []).length && <p className="privacy-note">Ingen opgaver i denne kategori endnu.</p>}
              </div>
              <div className="row">
                <button
                  type="button"
                  onClick={() => setTaskBank((current) => ({
                    ...current,
                    [taskEditorCategory]: [...(current[taskEditorCategory] || []), 'Ny opgave'],
                  }))}
                >+ Tilføj tekst</button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setTaskBank((current) => ({
                    ...current,
                    [taskEditorCategory]: [...(adminTaskBank[taskEditorCategory] || DEFAULT_TASK_BANK[taskEditorCategory] || [])],
                  }))}
                >Gendan kategori</button>
              </div>
            </section>
          </div>
        </details>

        <details className="setup-fold frue-settings">
          <summary>
            <span className="setup-fold-title">
              <strong>Frue</strong>
              <small>Status, udløsningslås, plug-dagbog og heldagsplan</small>
            </span>
            <span className="setup-fold-count">{frue.workMode ? 'Arbejde' : frue.lock === 'free' ? 'Fri' : 'Låst'}</span>
          </summary>
          <div className="setup-fold-content">
            <label className={frue.workMode ? 'privacy-option on' : 'privacy-option'}>
              <input
                type="checkbox"
                checked={frue.workMode}
                onChange={(event) => setFrue((current) => ({ ...current, workMode: event.target.checked }))}
              />
              <span><strong>Arbejds-mode</strong><small>Altid diskrete notifikationer og ingen fræk tekst på låseskærmen.</small></span>
            </label>

            <h3>Udløsningslås</h3>
            <div className="row">
              {([['free', 'Tilladt'], ['denied', 'Ikke tilladt'], ['edges', 'Edge først'], ['after_tasks', 'Efter opgaver'], ['night', 'Natte-lås']] as const).map(([id, title]) => (
                <button
                  key={id}
                  type="button"
                  className={frue.lock === id ? 'chip on' : 'chip'}
                  onClick={() => setFrue((current) => ({ ...current, lock: id }))}
                >{title}</button>
              ))}
            </div>
            {frue.lock === 'edges' && (
              <label className="field">
                <span>Antal edges før tilladelse</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={frue.lockEdges}
                  onChange={(event) => setFrue((current) => ({
                    ...current,
                    lockEdges: Math.max(1, Math.min(20, Number(event.target.value) || 1)),
                  }))}
                />
              </label>
            )}
            <p className="hint">Dage siden registreret udløsning: {daysSinceOrgasm(frue.lastOrgasmAt)}. Safeword stopper altid scenen.</p>

            <h3>Heldagsplan</h3>
            {frue.dayPlan.map((block) => (
              <label key={block.id} className={block.accepted ? 'privacy-option on' : 'privacy-option'}>
                <input
                  type="checkbox"
                  checked={block.accepted}
                  onChange={(event) => setFrue((current) => ({
                    ...current,
                    dayPlan: current.dayPlan.map((row) => row.id === block.id ? { ...row, accepted: event.target.checked } : row),
                  }))}
                />
                <span><strong>{block.title}</strong><small>{block.text}</small></span>
              </label>
            ))}
            <label className="field">
              <span>Lektie til næste session</span>
              <textarea
                rows={3}
                maxLength={500}
                value={frue.homework}
                placeholder="Fx sov med lille plug og rapportér status 1–10 næste gang"
                onChange={(event) => setFrue((current) => ({ ...current, homework: event.target.value }))}
              />
              <small>Gemmes kun på denne enhed, vises ved næste start og fjernes derefter.</small>
            </label>

            <div className="frue-section-heading">
              <h3>Plug-dagbog</h3>
              <button
                type="button"
                onClick={() => setFrue((current) => ({
                  ...current,
                  plugLog: [{
                    id: String(Date.now()),
                    plug: 'vinget plug',
                    startedAt: new Date().toISOString(),
                    slept: false,
                    note: '',
                  }, ...current.plugLog].slice(0, 20),
                }))}
              >+ Start log</button>
            </div>
            {frue.plugLog.slice(0, 4).map((entry) => (
              <article key={entry.id} className="frue-log-row">
                <label className="field">
                  <span>Plug</span>
                  <input
                    value={entry.plug}
                    onChange={(event) => setFrue((current) => ({
                      ...current,
                      plugLog: current.plugLog.map((row) => row.id === entry.id ? { ...row, plug: event.target.value } : row),
                    }))}
                  />
                </label>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={entry.slept}
                    onChange={(event) => setFrue((current) => ({
                      ...current,
                      plugLog: current.plugLog.map((row) => row.id === entry.id ? { ...row, slept: event.target.checked } : row),
                    }))}
                  />
                  Sov med
                </label>
                <label className="field">
                  <span>Note</span>
                  <input
                    value={entry.note}
                    placeholder="Behagelig / for stor / gled ud"
                    onChange={(event) => setFrue((current) => ({
                      ...current,
                      plugLog: current.plugLog.map((row) => row.id === entry.id ? { ...row, note: event.target.value } : row),
                    }))}
                  />
                </label>
                <div className="row">
                  {!entry.endedAt && (
                    <button type="button" onClick={() => setFrue((current) => ({
                      ...current,
                      plugLog: current.plugLog.map((row) => row.id === entry.id ? { ...row, endedAt: new Date().toISOString() } : row),
                    }))}>Afslut</button>
                  )}
                  <button type="button" className="danger" onClick={() => setFrue((current) => ({
                    ...current,
                    plugLog: current.plugLog.filter((row) => row.id !== entry.id),
                  }))}>Slet</button>
                  <small className="hint">{entry.endedAt ? 'Afsluttet' : 'Aktiv'}</small>
                </div>
              </article>
            ))}
            <p className="hint">Dagbogen gemmes kun lokalt og er ikke medicinsk rådgivning.</p>
          </div>
        </details>

        <details className="setup-fold panic-settings">
          <summary>
            <span className="setup-fold-title">
              <strong>Panikknap</strong>
              <small>Gem Stay og åbn en diskret destination</small>
            </span>
            <span className="setup-fold-count">
              {panicDestination.mode === 'decoy'
                ? 'Noter'
                : panicDestination.mode === 'weather'
                  ? 'Vejr'
                : panicDestination.mode === 'calendar'
                    ? 'Kalender'
                    : panicDestination.mode === 'shortcut'
                      ? 'Valgfri app'
                    : 'Eget valg'}
            </span>
          </summary>
          <div className="setup-fold-content panic-options">
            <p className="hint">Vælg hvad knappen “Noter” skal åbne. Et app-link åbner den tilhørende app, når mobilen understøtter det; ellers bruges browseren.</p>
            {([
              ['decoy', 'Diskrete noter', 'Bliv i Stay på en neutral noteside.'],
              ['weather', 'Vejret', 'Åbn en neutral vejrsøgning.'],
              ['calendar', 'Kalender', 'Åbn Google Kalender eller den tilknyttede app.'],
              ['shortcut', 'Valgfri app via Genveje', 'Åbn den app, du selv har valgt i en Apple Genvej.'],
              ['custom', 'Eget app- eller web-link', 'Indsæt fx en nyhedsside eller et app-link.'],
            ] as const).map(([mode, title, description]) => (
              <label className={panicDestination.mode === mode ? 'privacy-option on' : 'privacy-option'} key={mode}>
                <input
                  type="radio"
                  name="panic-destination"
                  checked={panicDestination.mode === mode}
                  onChange={() => choosePanicDestination({ ...panicDestination, mode })}
                />
                <span><strong>{title}</strong><small>{description}</small></span>
              </label>
            ))}
            {panicDestination.mode === 'shortcut' && (
              <div className="panic-shortcut-setup">
                <label className="field">
                  Navnet på din Apple Genvej
                  <input
                    value={panicDestination.shortcutName}
                    maxLength={100}
                    placeholder="Fx Stay panik"
                    onChange={(event) => choosePanicDestination({ ...panicDestination, shortcutName: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => window.location.assign('shortcuts://create-shortcut')}
                >
                  Åbn Genveje og opret
                </button>
                <ol className="panic-shortcut-guide">
                  <li>Tilføj handlingen “Åbn app”.</li>
                  <li>Vælg den app, panikknappen skal åbne.</li>
                  <li>Giv genvejen samme navn som ovenfor.</li>
                </ol>
              </div>
            )}
            {panicDestination.mode === 'custom' && (
              <label className="field">
                App- eller web-link
                <input
                  value={panicDestination.customUrl}
                  maxLength={500}
                  inputMode="url"
                  placeholder="https://eksempel.dk eller appnavn://"
                  onChange={(event) => choosePanicDestination({ ...panicDestination, customUrl: event.target.value })}
                />
              </label>
            )}
            <p className="privacy-note">
              Ved “Gem på denne enhed” gemmes den åbne scene før skiftet. En privat session bliver ikke gemt.
            </p>
          </div>
        </details>

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
              {r === 'domme' ? 'Jeg styrer' : 'Jeg adlyder'}
            </button>
          ))}
        </div>


        <h2>Leg</h2>
        <div className="row">
          {([
            ['oneway', 'Én vej'],
            ['mutual', 'Gensidig'],
          ] as Array<[PlayMode, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.playMode === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, playMode: id })}>{title}</button>
          ))}
        </div>
        <p className="hint">
          {profile.playMode === 'mutual'
            ? 'I rører begge. Partneren reagerer på sin egen bar og på din.'
            : 'Du bliver styret eller styrer. Partnerens krop er i fokus.'}
        </p>

        <h2>Din krop i chatten</h2>
        <p className="hint">
          Så “Næsten” og “Jeg kommer” rammer pik eller fisse. Det er ikke dit køn — bare kroppen i legen.
        </p>
        <div className="row">
          {([
            { id: 'penis' as UserAnatomy, title: 'Pik' },
            { id: 'vulva' as UserAnatomy, title: 'Fisse' },
          ]).map((item) => (
            <button
              key={item.id}
              className={profile.userAnatomy === item.id ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, userAnatomy: item.id })}
            >
              {item.title}
            </button>
          ))}
        </div>



        <div className="row">
          <button type="button" className="ghost" onClick={() => {
            window.localStorage.setItem('stay-favorite-scene', JSON.stringify(profile))
            setImageNotice('Favorit-scene gemt på telefonen.')
          }}>Gem som favorit-scene</button>
          <button type="button" className="ghost" onClick={() => {
            try {
              const raw = window.localStorage.getItem('stay-favorite-scene')
              if (!raw) { setImageNotice('Ingen favorit-scene gemt.'); return }
              const saved = JSON.parse(raw) as Profile
              setProfile({ ...profile, ...saved, partnerImageUrl: profile.partnerImageUrl })
              setImageNotice('Favorit-scene hentet.')
            } catch {
              setImageNotice('Kunne ikke hente favorit-scenen.')
            }
          }}>Hent favorit-scene</button>
        </div>

        <h2>Jeg er</h2>
        <div className="row">
          {([
            ['unset', 'Siger det ikke'],
            ['woman', 'Kvinde'],
            ['man', 'Mand'],
            ['nonbinary', 'Nonbinær'],
          ] as Array<[UserGender, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.userGender === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, userGender: id })}>{title}</button>
          ))}
        </div>

        <h2>Jeg vil have</h2>
        <div className="row">
          {([
            ['women', 'Kvinder'],
            ['men', 'Mænd'],
            ['both', 'Begge'],
            ['switch', 'Skifter'],
          ] as Array<[Attraction, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.attraction === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, attraction: id })}>{title}</button>
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
        <label className="field partner-name-field">
          Partnerens navn
          <input
            value={profile.partnerName}
            maxLength={32}
            autoComplete="off"
            placeholder={profile.figure === 'mistress' ? 'Fx Freja' : 'Fx Alexander'}
            onChange={(event) => setProfile({ ...profile, partnerName: event.target.value })}
            onBlur={() => {
              if (account) void savePartnerName(account.id, profile.partnerName).catch(() => undefined)
            }}
          />
          <span>Navnet bruges i chatten, på partnerkortet og i valgte notifikationer.</span>
        </label>

        <h2>Fræk</h2>
        <button
          className={profile.nsfw ? 'chip on' : 'chip'}
          disabled={!currentPlan.nsfw}
          onClick={() =>
            currentPlan.nsfw && setProfile({
                ...profile,
                nsfw: !profile.nsfw,
                look: !profile.nsfw ? 'nsfw' : 'clothed',
              })
          }
        >
          {!currentPlan.nsfw
            ? 'Fræk kræver Solo eller Plus'
            : profile.nsfw ? 'Fræk slået til — nøgen, pik, fisse, røv' : 'Fræk slået fra — tøjet på'}
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
              disabled={look === 'nsfw' && !currentPlan.nsfw}
              onClick={() => setProfile({ ...profile, look })}
            >
              {look === 'clothed' ? 'Tøjet på' : look === 'fetish' ? 'Sele og læder' : 'Nøgen / fræk'}
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
          “Skab AI-partner” bruger billedmodellen, som admin har valgt til scenen. Hud og krop er kun figurens udseende.
        </p>

        <h2>Billedpose</h2>
        <p className="hint">Vælg komposition til næste billede. Figuren er altid fiktiv og tydeligt voksen.</p>
        <div className="row">
          {([
            ['portrait', 'Portræt'],
            ['kneel_harness', 'På knæ i sele'],
            ['lace_rear', 'Blonder bagfra'],
            ['futa_harness', 'Futa / sele'],
            ['gyn_empty', 'Gynstol tom'],
            ['gyn_stirrups', 'Ben i bøjlerne'],
            ['gyn_plug', 'Plug close-up'],
            ['gyn_gloves', 'Handsker / inspektion'],
            ['gyn_strap', 'Strap-on i stolen'],
            ['gyn_frue', 'Fruen i stolen'],
            ['gyn_speculum', 'Spekulum-legetøj'],
            ['gyn_sfw', 'Klinik SFW'],
          ] as Array<[ImagePose, string]>).map(([id, title]) => (
            <button
              key={id}
              type="button"
              className={profile.imagePose === id ? 'chip on' : 'chip'}
              disabled={id !== 'portrait' && id !== 'gyn_sfw' && !currentPlan.nsfw}
              onClick={() => setProfile({
                ...profile,
                imagePose: id,
                ...(id !== 'portrait' && id !== 'gyn_sfw' ? { look: 'nsfw', nsfw: true } : {}),
              })}
            >{title}</button>
          ))}
        </div>

        <h2>Erhverv / uniform</h2>
        <p className="hint">Voksne roller. Underviser er universitet — aldrig skole eller mindreårige.</p>
        <div className="row">
          {PROFESSIONS.map((job) => (
            <button
              key={job.id}
              type="button"
              className={profile.profession === job.id ? 'chip on' : 'chip'}
              onClick={() => setProfile({ ...profile, profession: job.id })}
            >
              {job.title}
            </button>
          ))}
        </div>

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

        {profile.figure === 'master' && (
          <>
            <h2>Partnerens pik</h2>
            <p className="hint">Kun kropsvalg. Ingen raceleg eller nedsættende ord.</p>
            <div className="row">
              {([['none', 'Almindeligt valg'], ['bbc', 'BBC'], ['bwc', 'BWC']] as Array<[CockPreset, string]>).map(([id, title]) => (
                <button
                  key={id}
                  type="button"
                  className={profile.cockPreset === id ? 'chip on' : 'chip'}
                  onClick={() => setProfile({
                    ...profile,
                    cockPreset: id,
                    skin: id === 'bbc' ? 'dark' : id === 'bwc' ? 'light' : profile.skin,
                    penis: id === 'none' ? profile.penis : 'very_large',
                  })}
                >
                  {title}
                </button>
              ))}
            </div>
          </>
        )}

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
            <h2>Pik</h2>
            <div className="row">
              {(['average', 'large', 'very_large'] as Penis[]).map((p) => (
                <button
                  key={p}
                  className={profile.penis === p ? 'chip on' : 'chip'}
                  onClick={() => setProfile({ ...profile, penis: p })}
                >
                  {p === 'average' ? 'Almindelig pik' : p === 'large' ? 'Tyk pik' : 'Kraftig pik'}
                </button>
              ))}
            </div>
          </>
        )}


        <h2>Hår</h2>
        <p className="hint">Farve — vælg én</p>
        <div className="row">
          {([['blonde', 'Blond'], ['brown', 'Brunt'], ['black', 'Sort'], ['red', 'Rødt'], ['dark', 'Mørkt'], ['grey', 'Gråt']] as Array<[HairColor, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.hairColor === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, hairColor: id })}>{title}</button>
          ))}
        </div>
        <p className="hint">Længde — vælg én</p>
        <div className="row">
          {([['short', 'Kort'], ['shoulder', 'Skulder'], ['long', 'Langt']] as Array<[HairLength, string]>).map(([id, title]) => (
            <button
              key={id}
              type="button"
              className={profile.hairLength === id ? 'chip on' : 'chip'}
              onClick={() => {
                const legacyStyle = profile.hairLength === 'bun' || profile.hairLength === 'messy' ? profile.hairLength : null
                setProfile({
                  ...profile,
                  hairLength: id,
                  hairStyles: legacyStyle && !(profile.hairStyles || []).includes(legacyStyle)
                    ? [...(profile.hairStyles || []), legacyStyle]
                    : profile.hairStyles || [],
                })
              }}
            >{title}</button>
          ))}
        </div>
        <p className="hint">Styling — vælg gerne flere</p>
        <div className="row">
          {([['bun', 'Opsat'], ['messy', 'Pjusket']] as Array<[HairStyle, string]>).map(([id, title]) => {
            const selectedStyles = profile.hairStyles || (profile.hairLength === 'bun' || profile.hairLength === 'messy' ? [profile.hairLength] : [])
            const selected = selectedStyles.includes(id)
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                className={selected ? 'chip on' : 'chip'}
                onClick={() => setProfile({
                  ...profile,
                  hairLength: profile.hairLength === 'bun' || profile.hairLength === 'messy' ? 'long' : profile.hairLength,
                  hairStyles: selected ? selectedStyles.filter((style) => style !== id) : [...selectedStyles, id],
                })}
              >{title}</button>
            )
          })}
        </div>
        <h2>Øjne</h2>
        <div className="row">
          {([['brown', 'Brune'], ['green', 'Grønne'], ['blue', 'Blå'], ['grey', 'Grå']] as Array<[EyeColor, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.eyes === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, eyes: id })}>{title}</button>
          ))}
        </div>
        {profile.figure === 'mistress' && (
          <>
            <h2>Makeup</h2>
            <div className="row">
              {([['none', 'Ingen'], ['soft', 'Blød'], ['heavy', 'Tyk'], ['smudged', 'Sløset']] as Array<[Makeup, string]>).map(([id, title]) => (
                <button key={id} type="button" className={profile.makeup === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, makeup: id })}>{title}</button>
              ))}
            </div>
          </>
        )}
        {profile.figure === 'master' && (
          <>
            <h2>Skæg</h2>
            <div className="row">
              {([['none', 'Glat'], ['stubble', 'Stubbe'], ['beard', 'Skæg']] as Array<[FacialHair, string]>).map(([id, title]) => (
                <button key={id} type="button" className={profile.facialHair === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, facialHair: id })}>{title}</button>
              ))}
            </div>
          </>
        )}
        <h2>Numse</h2>
        <div className="row">
          {([['small', 'Lille'], ['round', 'Rund'], ['large', 'Stor og blød']] as Array<[AssSize, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.ass === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, ass: id })}>{title}</button>
          ))}
        </div>
        <h2>Hofter</h2>
        <div className="row">
          {([['narrow', 'Smal'], ['soft', 'Blød'], ['wide', 'Bred']] as Array<[HipSize, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.hips === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, hips: id })}>{title}</button>
          ))}
        </div>
        <h2>Nedenunder</h2>
        <div className="row">
          {([['shaved', 'Glatbarberet'], ['trimmed', 'Trimmet'], ['natural', 'Naturlig']] as Array<[PubicStyle, string]>).map(([id, title]) => (
            <button key={id} type="button" className={profile.pubic === id ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, pubic: id })}>{title}</button>
          ))}
        </div>
        <h2>Detaljer</h2>
        <div className="row">
          <button type="button" className={profile.freckles ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, freckles: !profile.freckles })}>Fregner</button>
          <button type="button" className={profile.tattoos ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, tattoos: !profile.tattoos })}>Tatoveringer</button>
          <button type="button" className={profile.wet ? 'chip on' : 'chip'} onClick={() => setProfile({ ...profile, wet: !profile.wet })}>Våd hud</button>
        </div>
        <label className="field">
          Skriv selv
          <input
            value={profile.lookWish}
            maxLength={180}
            placeholder="Fx rød læbestift, slange-tatovering på lår, gennemboret navle"
            onChange={(e) => setProfile({ ...profile, lookWish: e.target.value })}
          />
        </label>

        <label className="field">
          Alder på AI-partner (18+)
          <PartnerAgeInput
            key={profile.partnerAge}
            value={profile.partnerAge}
            onChange={(partnerAge) => setProfile((current) => ({ ...current, partnerAge }))}
          />
        </label>
        <p className="hint">Bruges til partnerens beskrivelse og billeder. Aldrig under 18.</p>

        <section className="partner-image-builder" aria-live="polite">
          <div className={profile.partnerImageUrl ? 'generated-partner-image' : 'generated-partner-image empty'}>
            {profile.partnerImageUrl ? (
              <img
                src={profile.partnerImageUrl}
                alt={`Genereret billede af ${partnerDisplayName(profile)}`}
              />
            ) : (
              <span>{profile.figure === 'mistress' ? 'M' : 'M'}</span>
            )}
          </div>
          <div>
            <h2>AI-partnerens billede</h2>
            <p className="hint">
              Lås først et godt billede. Derefter bruger “Ny positur” det som reference, så ansigt og krop bevares bedre.
            </p>
            <button
              type="button"
              className="primary"
              disabled={imageBusy || imageGenerationsLeft < 1}
              onClick={() => void (favoriteLook ? createPartnerPose() : createPartnerImage())}
            >
              {imageBusy
                ? 'Skaber billede…'
                : favoriteLook
                  ? `Ny positur – samme ${partnerDisplayName(profile)}`
                  : profile.partnerImageUrl
                    ? 'Lav et nyt billede'
                    : `Skab ${partnerDisplayName(profile)}`}
            </button>
            <div className="row look-actions">
              <button
                type="button"
                className="ghost"
                disabled={favoriteBusy || !profile.partnerImageUrl}
                onClick={() => void saveCurrentLook()}
              >
                {favoriteBusy
                  ? 'Gemmer…'
                  : profile.partnerImageUrl === favoriteLook?.imageUrl
                    ? 'Fast udseende gemt'
                    : favoriteLook
                      ? 'Brug som nyt fast udseende'
                      : 'Brug som fast udseende'}
              </button>
              {favoriteLook && profile.partnerImageUrl !== favoriteLook.imageUrl && (
                <button type="button" className="ghost" disabled={favoriteBusy} onClick={useFavoriteLook}>
                  Brug originalen
                </button>
              )}
              {favoriteLook && (
                <button
                  type="button"
                  className="ghost"
                  disabled={imageBusy || imageGenerationsLeft < 1}
                  onClick={() => {
                    if (window.confirm(`Vil du lave en helt ny partner i stedet for ${partnerDisplayName(profile)}?`)) {
                      void createPartnerImage(true)
                    }
                  }}
                >
                  Lav helt ny partner
                </button>
              )}
              {favoriteLook && (
                <button type="button" className="ghost" disabled={favoriteBusy} onClick={() => void dropFavoriteLook()}>
                  Fjern fast udseende
                </button>
              )}
              <button
                type="button"
                className="ghost"
                disabled={!profile.partnerImageUrl}
                onClick={() => void saveImageToDevice(profile.partnerImageUrl, `${profile.figure}.png`)}
              >
                Gem til telefon
              </button>
            </div>
            <small>{imageGenerationsLeft} figurbilleder tilbage</small>
            <p className="hint">
              Nye positurer bruger ét figurbillede. Genvalg af et fast billede er gratis.
            </p>
          </div>
        </section>
        {favoriteLook && (
          <section className="fixed-partner-gallery" aria-labelledby="fixed-partner-gallery-title">
            <div>
              <h2 id="fixed-partner-gallery-title">Faste billeder af {partnerDisplayName(profile)}</h2>
              <span>{favoriteLook.poseImages.length} af 4</span>
            </div>
            <p className="hint">Tryk på et billede for at bruge det igen uden billedforbrug.</p>
            <div className="partner-gallery fixed" role="list" aria-label="Faste partnerbilleder">
              {favoriteLook.poseImages.map((imageUrl, index) => (
                <button
                  key={`fixed-${imageUrl.slice(-32)}-${index}`}
                  type="button"
                  role="listitem"
                  className={profile.partnerImageUrl === imageUrl ? 'on' : ''}
                  onClick={() => {
                    setProfile((current) => ({ ...current, partnerImageUrl: imageUrl }))
                    setImageNotice('Det faste billede er valgt uden nyt billedforbrug.')
                  }}
                >
                  <img src={imageUrl} alt={`${partnerDisplayName(profile)} – fast billede ${index + 1}`} />
                </button>
              ))}
              {Array.from({ length: Math.max(0, 4 - favoriteLook.poseImages.length) }, (_, index) => (
                <button
                  key={`empty-pose-${index}`}
                  type="button"
                  className="empty-pose"
                  disabled={imageBusy || imageGenerationsLeft < 1}
                  onClick={() => void createPartnerPose()}
                >
                  <span>+</span>
                  <small>Ny positur</small>
                </button>
              ))}
            </div>
          </section>
        )}
        {gallery.length > 0 && (
          <div className="partner-gallery all-images" role="list" aria-label="Tidligere partnerbilleder på denne enhed">
            {gallery.map((imageUrl, index) => (
              <button
                key={`${imageUrl.slice(-32)}-${index}`}
                type="button"
                role="listitem"
                className={profile.partnerImageUrl === imageUrl ? 'on' : ''}
                onClick={() => {
                  setProfile((current) => ({ ...current, partnerImageUrl: imageUrl }))
                  setImageNotice('Billedet er valgt fra galleriet.')
                }}
              >
                <img src={imageUrl} alt={`Partnerbillede ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
        {imageNotice && <p className="form-message">{imageNotice}</p>}

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

        <label className="field custom-wish-field">
          Det må AI-partneren huske
          <textarea
            value={profile.memoryNotes}
            maxLength={600}
            rows={4}
            placeholder="Fx: Jeg kan bedst lide en rolig start, korte opgaver og at blive kaldt mit chatnavn."
            onChange={(event) => setProfile({ ...profile, memoryNotes: event.target.value })}
          />
          <span>
            {profile.privacyMode === 'device'
              ? 'Gemmes kun på denne enhed · højst 600 tegn'
              : 'Privat tilstand: bruges nu, men gemmes ikke til næste besøg'}
          </span>
        </label>
        {profile.lastMemory && <p className="hint">Sidste scene: {profile.lastMemory}</p>}

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

        <details className="setup-fold equipment-fold">
          <summary>
            <span className="setup-fold-title">
              <strong>Udstyr til rådighed</strong>
              <small>Tryk for at åbne eller lukke listen</small>
            </span>
            <span className="setup-fold-count">
              {contentCatalog.equipment.filter(
                (item) => item.enabled
                  && planCanUseContent(profile.plan, item)
                  && profile.equipment.includes(item.id),
              ).length + (profile.customEquipment.trim() ? 1 : 0)} valgt
            </span>
          </summary>
          <div className="setup-fold-content">
            <p className="hint">Vælg kun det, du faktisk har. AI-partneren tilpasser scenen efter listen.</p>
            <div className="equipment-category-list">
              {contentCatalog.equipmentCategories
                .filter((category) => category.enabled)
                .sort((a, b) => a.order - b.order)
                .map((category) => {
                  const items = contentCatalog.equipment.filter(
                    (item) => item.group === category.title && item.enabled && planCanUseContent(profile.plan, item),
                  )
                  if (!items.length) return null
                  const selected = items.filter((item) => profile.equipment.includes(item.id)).length
                  return (
                    <details className="equipment-category-fold" key={category.id}>
                      <summary>
                        <span>{category.title}</span>
                        <small>{selected ? `${selected} valgt` : `${items.length} muligheder`}</small>
                      </summary>
                      <div className="equipment-grid">
                        {items.map((item) => (
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
                    </details>
                  )
                })}
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
          </div>
        </details>

        

        <h2>Lingeri og sissy</h2>
        <p className="hint">Hvad har du på, og hvad har partneren på.</p>
        <p className="hint">Dig</p>
        <div className="row">
          {['Trusser', 'G-streng', 'BH', 'Strømper', 'Hofteholder', 'Babydoll', 'Korset', 'Sissy-kjole', 'Paryk', 'Choker'].map((title) => (
            <button
              key={'u-'+title}
              type="button"
              className={profile.lingerieUser.includes(title) ? 'chip on' : 'chip'}
              onClick={() => setProfile({
                ...profile,
                lingerieUser: profile.lingerieUser.includes(title)
                  ? profile.lingerieUser.filter((x) => x !== title)
                  : [...profile.lingerieUser, title],
              })}
            >{title}</button>
          ))}
        </div>
        <p className="hint">Partner</p>
        <div className="row">
          {['Trusser', 'G-streng', 'BH', 'Strømper', 'Hofteholder', 'Babydoll', 'Korset', 'Sissy-kjole', 'Paryk', 'Choker', 'Åben kittel'].map((title) => (
            <button
              key={'p-'+title}
              type="button"
              className={profile.lingeriePartner.includes(title) ? 'chip on' : 'chip'}
              onClick={() => setProfile({
                ...profile,
                lingeriePartner: profile.lingeriePartner.includes(title)
                  ? profile.lingeriePartner.filter((x) => x !== title)
                  : [...profile.lingeriePartner, title],
              })}
            >{title}</button>
          ))}
        </div>

        <h2>Ord chatten må bruge</h2>
        <label className="field">
          Plus-liste
          <input
            value={profile.likeWords}
            maxLength={200}
            placeholder="Fx god pige, sprøjt, slik, min røv"
            onChange={(e) => setProfile({ ...profile, likeWords: e.target.value })}
          />
        </label>
        <label className="field">
          Minus-liste — brug aldrig
          <input
            value={profile.banWords}
            maxLength={200}
            placeholder="Fx luder, pattebarn, skolesprog"
            onChange={(e) => setProfile({ ...profile, banWords: e.target.value })}
          />
        </label>
        <p className="hint">Adskil med komma. Minus slår altid plus. Safeword og 18+-regler kan ikke slås fra.</p>

<h2>Fetish</h2>
        <div className="grid">
          {contentCatalog.fetishes.filter((item) => item.enabled).map((item) => {
            const lockedPack = !item.free && !profile.unlocked.includes(item.id)
            const active = profile.fetishes.includes(item.id)
            return (
              <button
                key={item.id}
                className={`pack ${active ? 'on' : ''} ${lockedPack ? 'locked' : ''}`}
                onClick={() => toggleFetish(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{lockedPack ? 'Tilkøb' : item.blurb}</span>
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
          Plan: {profile.plan} · chat tilbage i dag: {chatMessagesLeft} · figurbilleder tilbage: {imageGenerationsLeft}
          {' '}· billedanalyser tilbage: {imageAnalysesLeft}
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
            {contentCatalog.fetishes.filter((item) => item.enabled && !item.free).map((item) => (
              <div className="shop-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.blurb}</p>
                </div>
                {profile.unlocked.includes(item.id) ? (
                  <span className="ok">Købt</span>
                ) : (
                  <button className="chip on" onClick={() => unlock(item.id)}>
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
        <p className="lede">{aftercare(profile, aftercareReason)}</p>
        <div className="log">
          {lines.slice(-4).map((l) => (
            <p key={l.id} className={l.from}>
              {l.text}
            </p>
          ))}
        </div>
        <div className="row">
          <button
            className="primary"
            onClick={() => {
              setAftercareReason('finish')
              setNear('ok')
              setPartnerHeat(20)
              setUserHeat(12)
              setRunning(true)
              setPhase('session')
              push(aiLine('Igen. Tøjet bliver hvor det er. Vi tager den fra toppen.'))
            }}
          >
            En gang til
          </button>
          <button
            className="ghost"
            onClick={() => {
              push(aiLine(aftercare(profile, aftercareReason)))
            }}
          >
            Hold mig
          </button>
        </div>
        <button
          className="ghost"
          onClick={() => {
            dropMedia()
            if (profile.privacyMode === 'private') {
              setGallery([])
              setFavoriteLook(null)
              setProfile((current) => ({ ...current, partnerImageUrl: undefined }))
            }
            setPhase('home')
            setLines([])
          }}
        >
          Tilbage til start
        </button>
      </main>
    )
  }

  const activeScene = sceneCatalog.find((scene) => scene.id === profile.sceneId)
  const partnerName = partnerDisplayName(profile)
  const userChatName = profile.chatName.trim() || 'Dig'

  return (
    <main className="shell session" data-running={running} data-stage={stageOpen}>
      {stageOpen && profile.partnerImageUrl && (
        <>
        <button
          type="button"
          className="modal-backdrop"
          aria-label="Luk stort partnerbillede"
          onClick={() => setStageOpen(false)}
        />
        <section className="stage" role="dialog" aria-modal="true" aria-label={`${partnerName} i stort billede`}>
          <div className="stage-head">
            <strong>{partnerName}</strong>
            <button type="button" onClick={() => setStageOpen(false)} aria-label="Luk stort partnerbillede">
              × Luk
            </button>
          </div>
          <button type="button" className="stage-hit" onClick={() => setStageOpen(false)}>
            <img src={profile.partnerImageUrl} alt={`AI-partneren ${partnerName}`} />
          </button>
          <div className="stage-tools">
            <button type="button" className="ghost" onClick={() => void saveImageToDevice(profile.partnerImageUrl, `${partnerName.toLowerCase()}.png`)}>Gem billede</button>
            <button type="button" className="ghost" onClick={() => setStageOpen(false)}>Lille visning</button>
            {saveNotice && <small className="stage-note">{saveNotice}</small>}
          </div>
        </section>
        </>
      )}
      {fullScreenImage && (
        <>
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Luk stort chatbillede"
            onClick={() => setFullScreenImage(null)}
          />
          <section className="stage" role="dialog" aria-modal="true" aria-label={fullScreenImage.alt}>
            <div className="stage-head">
              <strong>{fullScreenImage.alt}</strong>
              <button type="button" onClick={() => setFullScreenImage(null)}>× Luk</button>
            </div>
            <button type="button" className="stage-hit" onClick={() => setFullScreenImage(null)}>
              <img src={fullScreenImage.url} alt={fullScreenImage.alt} />
            </button>
            <div className="stage-tools">
              <button type="button" className="ghost" onClick={() => void saveImageToDevice(fullScreenImage.url, 'stay-chatbillede.png')}>Gem billede</button>
              <button type="button" className="ghost" onClick={() => setFullScreenImage(null)}>Lille visning</button>
            </div>
          </section>
        </>
      )}
      {sessionMenuOpen && (
        <button
          type="button"
          className="session-menu-backdrop"
          aria-label="Luk sidemenu"
          onClick={() => setSessionMenuOpen(false)}
        />
      )}
      <header className="partner-card">
        <button
          type="button"
          className={profile.partnerImageUrl ? 'partner-portrait' : 'partner-portrait empty'}
          disabled={!profile.partnerImageUrl}
          onClick={() => {
            if (!profile.partnerImageUrl) return
            setBodyOpen(false)
            setStageOpen((open) => !open)
          }}
        >
          {profile.partnerImageUrl ? (
            <img src={profile.partnerImageUrl} alt={`AI-partneren ${partnerName}`} />
          ) : (
            <span aria-label="Partnerbillede er ikke oprettet endnu">{partnerName.slice(0, 1)}</span>
          )}
        </button>
        <div className="partner-details">
          <span className="partner-status"><i /> {partnerHeat >= 100 ? 'kommer…' : partnerHeat >= 80 ? (profile.figure === 'mistress' ? 'ahh… vent…' : 'ahh… hold…') : 'AI-partner'}</span>
          <strong>{partnerName}</strong>
          <small>{activeScene?.title || 'Privat chat'} · {profile.nsfw ? 'Fræk' : 'Tøjet på'} · cyklus {cycle}</small>
          <small className="privacy-status">
            {profile.privacyMode === 'private' ? 'Privat · gemmes ikke' : 'Gemmes kun på denne enhed'}
          </small>
          {!profile.partnerImageUrl && <small className="portrait-empty-text">Billede ikke oprettet endnu</small>}
          {favoriteLook?.poseImages.includes(profile.partnerImageUrl || '') && (
            <small className="portrait-empty-text">Fast partnerbillede</small>
          )}
        </div>
        <div className="session-menu-row">
          <button type="button" className="session-menu-toggle" onClick={() => { setSessionMenuOpen(false); setPhase('setup') }}>
            ← Menu
          </button>
          <button
            type="button"
            className="session-menu-toggle"
            aria-expanded={sessionMenuOpen}
            aria-controls="session-side-menu"
            onClick={() => setSessionMenuOpen((open) => !open)}
          >
            ☰ Scene
          </button>
        </div>
        <aside id="session-side-menu" className={sessionMenuOpen ? 'session-side-menu open' : 'session-side-menu'}>
          <div className="session-side-head">
            <strong>Scene og indstillinger</strong>
            <button type="button" onClick={() => { setSessionMenuOpen(false); setPhase('setup') }}>← Opsætning</button>
            <button type="button" onClick={() => setSessionMenuOpen(false)}>× Luk</button>
          </div>
          <div className="chat-tools">
          <button className="note-button" onClick={panic}>Noter</button>
          <button
            type="button"
            className={soundOn ? 'note-button on' : 'note-button'}
            aria-pressed={soundOn}
            onClick={() => setSoundOn((on) => {
              const next = !on
              if (next && !soundContextRef.current) {
                try {
                  soundContextRef.current = new AudioContext()
                  void soundContextRef.current.resume()
                } catch {
                  soundContextRef.current = null
                }
              }
              return next
            })}
          >
            {soundOn ? 'Lyd til' : 'Lyd fra'}
          </button>
          <button
            type="button"
            className={availableOn ? 'note-button on' : 'note-button'}
            aria-pressed={availableOn}
            onClick={() => {
              void (async () => {
                if (availableOn) {
                  const error = await unsubscribeStayPush()
                  setAvailableOn(false)
                  setAvailabilityNotice(error || 'Til rådighed er slået fra.')
                  return
                }
                const error = await subscribeStayPush({
                  explicit: profile.notificationStyle === 'explicit' && !frue.workMode && frue.status.place !== 'work',
                  partnerTitle: partnerDisplayName(profile),
                  plan: taskPlan,
                  taskBank,
                })
                if (error) {
                  setAvailabilityNotice(error)
                  return
                }
                setAvailableOn(true)
                setAvailabilityNotice('Til rådighed er slået til. Opgaver kan nu komme, også når appen er lukket.')
              })()
            }}
          >
            {availableOn ? 'Til rådighed' : 'Ikke til rådighed'}
          </button>
          <button className="safe" onClick={() => tickSession('safe')}>
            {profile.limits.safeword}
          </button>
          </div>
          {availabilityNotice && <p className="hint availability-notice">{availabilityNotice}</p>}
          <section className="heat-board" aria-label="Hvor tæt I er på at komme">
            <div className="heat-row">
              <span>{partnerName}</span>
              <div className="heat-track"><i style={{ width: `${partnerHeat}%` }} /></div>
              <em>{partnerHeat}</em>
            </div>
            <div className="heat-row">
              <span>Dig</span>
              <div className="heat-track user"><i style={{ width: `${userHeat}%` }} /></div>
              <em>{userHeat}</em>
              <div className="heat-adjust">
                <button type="button" onClick={() => setUserHeat((h) => Math.max(0, h - 8))}>−</button>
                <button type="button" onClick={() => setUserHeat((h) => Math.min(100, h + 8))}>+</button>
              </div>
            </div>
          </section>
        </aside>
      </header>

      {activeTask && (
        <section className="active-task-card" aria-live="polite">
          <div>
            <strong>Aktuel opgave</strong>
            <p>{activeTask}</p>
          </div>
          <div className="active-task-actions">
            <button type="button" disabled={aiThinking} onClick={() => void completeTask()}>Opgave udført</button>
            <button type="button" className="task-not-completed" disabled={aiThinking} onClick={() => void failTask()}>Ikke fuldført</button>
            <button type="button" disabled={aiThinking} onClick={() => taskPhotoRef.current?.click()}>Send foto</button>
            <button type="button" className="ghost" onClick={() => setActiveTask('')}>Skjul</button>
          </div>
        </section>
      )}


      {(edgeMode !== 'idle' || strokeLeft > 0) && (
        <p className="hint">{edgeMode === 'play' ? `Spil pik · ${edgeLeft}s` : edgeMode === 'hold' ? `Stop · ${edgeLeft}s` : ''}{strokeLeft ? ` · ryk tilbage: ${strokeLeft}` : ''}</p>
      )}
      {bodyOpen && (
        <>
        <button
          type="button"
          className="modal-backdrop"
          aria-label="Luk kropskort"
          onClick={() => setBodyOpen(false)}
        />
        <section className="body-board" role="dialog" aria-modal="true" aria-label="Berør AI-partnerens krop">
          <div className="body-board-head">
            <div>
              <strong>Rør ved {partnerName}</strong>
              <p>Tryk på en zone. Partneren reagerer i chatten.</p>
            </div>
            <div className="body-board-controls">
              <div className="body-view-switch" role="group" aria-label="Vælg kropsside">
                <button
                  type="button"
                  className={bodyView === 'front' ? 'chip on' : 'chip'}
                  onClick={() => setBodyView('front')}
                >
                  Forfra
                </button>
                <button
                  type="button"
                  className={bodyView === 'back' ? 'chip on' : 'chip'}
                  onClick={() => setBodyView('back')}
                >
                  Bagfra
                </button>
              </div>
              <button type="button" className="body-close" onClick={() => setBodyOpen(false)}>
                × Luk
              </button>
            </div>
          </div>
          <div className={`body-stage ${bodyView}`}>
            <img
              src={bodyMapSrc(profile.figure, bodyView)}
              alt=""
              className="body-stage-photo body-stage-map"
            />
            <div className="body-stage-shade" aria-hidden="true" />
            {BODY_ZONES.filter((zone) => zone.view === bodyView).map((zone) => (
              <button
                key={`${zone.view}-${zone.id}`}
                type="button"
                className="body-zone"
                disabled={aiThinking}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                }}
                onClick={() => void touchBodyZone(zone)}
              >
                <span>{zone.label}</span>
              </button>
            ))}
          </div>
          <small>
            Fast kropskort til tryk. AI-partnerens eget billede vises fortsat i chatten.
            NSFW, plan, temaer og safeword gælder stadig.
          </small>
        </section>
        </>
      )}

      <div className="log chat-log" aria-live="polite">
        {lines.map((line) => line.from === 'system' ? (
          <div key={line.id} className="system-message"><span>{line.text}</span></div>
        ) : (
          <div key={line.id} className={`message ${line.from}`}>
            <span className="message-name">{line.from === 'ai' ? partnerName : userChatName}</span>
            <p>{line.text}</p>
            {line.imageUrl && (
              <button
                type="button"
                className="chat-generated-image"
                onClick={() => setFullScreenImage({ url: line.imageUrl || '', alt: `Billede fra ${partnerName}` })}
              >
                <img src={line.imageUrl} alt={`Billede fra ${partnerName}`} />
                <span>Tryk for fuld skærm</span>
              </button>
            )}
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
              <button
                type="button"
                className="chat-upload-image"
                onClick={() => setFullScreenImage({ url: media.url, alt: 'Dit valgte billede' })}
              >
                <img src={media.url} alt="Dit valgte medie" />
              </button>
            )}
            <div className="preview-footer">
          <span>{media.kind === 'image' && aiIsConfigured() ? 'Sendt til privat billedanalyse' : 'Kun på din telefon'}</span>
              {media.kind === 'image' && (
                <button type="button" onClick={() => void saveImageToDevice(media.url, 'stay-chatbillede.png')}>Gem</button>
              )}
              <button type="button" onClick={dropMedia}>Skjul</button>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      <div className="chat-bottom">
        <details className="session-more status-strip">
          <summary>Status · {frue.status.arousal}/10 · {frue.status.place === 'work' ? 'Arbejde' : frue.status.place === 'others' ? 'Andre nær' : 'Alene'}</summary>
          <span className="hint">{statusLine(frue.status)} · lås {frue.lock}{daysSinceOrgasm(frue.lastOrgasmAt) ? ` · ${daysSinceOrgasm(frue.lastOrgasmAt)} dage` : ''}</span>
          <div className="row" aria-label="Tændingsniveau">
            {[1, 3, 5, 8, 10].map((level) => (
              <button
                key={level}
                type="button"
                className={frue.status.arousal === level ? 'chip on' : 'chip'}
                onClick={() => {
                  setFrue((current) => ({ ...current, status: { ...current.status, arousal: level } }))
                  void sendAiRequest(`Status: tændt ${level}/10.`, 'chat', `Tændt ${level}`)
                }}
              >{level}</button>
            ))}
          </div>
          <div className="row">
            {([['none', 'Ingen plug'], ['small', 'Lille plug'], ['purple', 'Lilla plug'], ['large', 'Stor plug']] as const).map(([id, title]) => (
              <button
                key={id}
                type="button"
                className={frue.status.plug === id ? 'chip on' : 'chip'}
                onClick={() => setFrue((current) => ({ ...current, status: { ...current.status, plug: id } }))}
              >{title}</button>
            ))}
            <button
              type="button"
              className={frue.status.panties ? 'chip on' : 'chip'}
              onClick={() => setFrue((current) => ({ ...current, status: { ...current.status, panties: !current.status.panties } }))}
            >{frue.status.panties ? 'Trusser på' : 'Ingen trusser'}</button>
            {(['none', 'little', 'lots'] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={frue.status.precum === id ? 'chip on' : 'chip'}
                onClick={() => setFrue((current) => ({ ...current, status: { ...current.status, precum: id } }))}
              >{id === 'none' ? 'Intet precum' : id === 'little' ? 'Lidt' : 'Meget'}</button>
            ))}
          </div>
          <div className="row">
            {([['alone', 'Alene'], ['work', 'Arbejde'], ['others', 'Andre nær']] as const).map(([id, title]) => (
              <button
                key={id}
                type="button"
                className={frue.status.place === id ? 'chip on' : 'chip'}
                onClick={() => setFrue((current) => ({
                  ...current,
                  workMode: id === 'work' ? true : current.workMode,
                  status: { ...current.status, place: id },
                }))}
              >{title}</button>
            ))}
            <label className="status-estim-field">
              <span>E-stim</span>
              <input
                value={frue.status.estim}
                maxLength={8}
                onChange={(event) => setFrue((current) => ({ ...current, status: { ...current.status, estim: event.target.value } }))}
              />
            </label>
          </div>
          <div className="row" aria-label="Brystvortestatus">
            {([['free', 'Vorter fri'], ['clamped', 'Vorter klemt'], ['estim', 'E-stim på vorter']] as const).map(([id, title]) => (
              <button
                key={id}
                type="button"
                className={frue.status.nipples === id ? 'chip on' : 'chip'}
                onClick={() => setFrue((current) => ({ ...current, status: { ...current.status, nipples: id } }))}
              >{title}</button>
            ))}
          </div>
          {frue.dayPlan.some((block) => block.accepted) && (
            <div className="row" aria-label="Heldagsplan">
              {frue.dayPlan.filter((block) => block.accepted).map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className={block.done ? 'chip on' : 'chip'}
                  onClick={() => setFrue((current) => ({
                    ...current,
                    dayPlan: current.dayPlan.map((row) => row.id === block.id ? { ...row, done: !row.done } : row),
                  }))}
                >{block.done ? '✓ ' : ''}{block.title}</button>
              ))}
            </div>
          )}
        </details>
        <div className="chat-primary-actions">
          <button
            type="button"
            className={bodyOpen ? 'body-dock on' : 'body-dock'}
            aria-expanded={bodyOpen}
            onClick={() => {
              if (bodyOpen) {
                setBodyOpen(false)
                return
              }
              setStageOpen(false)
              setBodyOpen(true)
            }}
          >
            {bodyOpen ? 'Luk krop' : 'Rør kroppen'}
          </button>
          <button className="task-main" type="button" disabled={aiThinking} onClick={() => void requestTask()}>
            {aiThinking ? 'Venter på kommando…' : 'Giv mig en ordre'}
          </button>
        </div>
        <div className="chat-moment-actions" aria-label="Vigtige scenevalg">
          <button type="button" disabled={aiThinking} onClick={() => void sendCloseMoment()}>Tæt på</button>
          <button type="button" onClick={() => tickSession('too')}>For meget</button>
          <button type="button" className="finish" disabled={aiThinking} onClick={() => void sendClimaxMoment()}>Jeg kommer</button>
        </div>
        <details className="session-more">
          <summary>Flere handlinger</summary>
          <div className="session-actions" aria-label="Flere scenevalg">
            <button type="button" disabled={aiThinking} onClick={() => void requestInspection()}>Inspektion</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestProtocol()}>Protocol</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestKegel('kegel')}>Kegel</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestKegel('reverse')}>Reverse kegel</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestScenePermission('touch')}>Må jeg røre</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestScenePermission('climax')}>Må jeg komme</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestScenePermission('swallow')}>Må jeg sluge</button>
            <button type="button" disabled={aiThinking} onClick={() => void requestPlugChange()}>Skift plug</button>
            <button type="button" disabled={aiThinking} onClick={() => void stopEstim()}>Sluk e-stim</button>
            <button type="button" disabled={aiThinking} onClick={() => void reportSwallowed()}>Kommet + slugt</button>
            <button type="button" disabled={aiThinking} onClick={() => fileRef.current?.click()}>Send bevis</button>
            <button type="button" disabled={imageBusy || aiThinking} onClick={() => void createChatImage()}>
              {imageBusy ? 'Laver billede…' : 'Billede i chat'}
            </button>
            <button type="button" disabled={aiThinking} onClick={() => {
              setStrokeLeft(10)
              void sendAiRequest('Ti ryk. Tæl med. Stop efter ti.', 'task', '10 ryk')
            }}>10 ryk</button>
            <button type="button" className={edgeMode === 'play' ? 'chip on' : 'chip'} onClick={() => {
              setEdgeMode('play')
              setEdgeLeft(45)
              void sendAiRequest('Spil pikken nu. Langsomt. Stop når uret siger det.', 'task', 'Spil pik')
            }}>Spil pik</button>
            <button type="button" className={edgeMode === 'hold' ? 'chip on' : 'chip'} onClick={() => {
              setEdgeMode('hold')
              setEdgeLeft(20)
              void sendAiRequest('Hænderne væk. Pikken må bare stå og pulserer.', 'task', 'Stop')
            }}>Stop</button>
            <button type="button" disabled={aiThinking} onClick={() => void sendRuinedMoment()}>Ruined</button>
            <button type="button" onClick={() => tickSession('ok')}>Igen</button>
            <button type="button" onClick={() => tickSession('deny')}>Nægt</button>
            <button type="button" className="finish" onClick={() => tickSession('finish')}>Hold mig</button>
          </div>
          <span>Ordren passer til scenen, din krop og dit legetøj.</span>
        </details>

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
        <p className="chat-caption">
          {aiIsConfigured() ? 'AI aktiv' : 'Demo-svar'} · {chatMessagesLeft} chatbeskeder · {imageAnalysesLeft} billedanalyser tilbage
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void attachMedia(file)
        }}
      />
      <input
        ref={taskPhotoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void sendTaskPhoto(file)
        }}
      />
    </main>
  )
}
