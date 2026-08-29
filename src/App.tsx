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
  NotificationStyle,
  Penis,
  Personality,
  Phase,
  PrivacyMode,
  Profile,
  Role,
  Skin,
  UserAnatomy,
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
import { aiIsConfigured, analyzeImage, askAi, generatePartnerImage } from './engine/ai'
import { AdminScreen, LoginScreen } from './screens/AuthScreens'
import { isStandalone } from './pwa'
import { availableScenes, DEFAULT_SCENES, observeScenes, openingPromptForPlan } from './engine/scenes'
import {
  DEFAULT_CONTENT_CATALOG,
  observeContentCatalog,
  planCanUseContent,
  type ContentCatalog,
} from './engine/contentCatalog'
import { observeChatName, saveChatName } from './engine/userProfile'
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
  hasDeviceSession,
  loadDeviceSession,
  loadNotificationStyle,
  loadPanicDestination,
  loadPrivacyMode,
  saveDeviceSession,
  saveNotificationStyle,
  savePanicDestination,
  savePrivacyMode,
  type PanicDestination,
} from './engine/sessionStore'
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
import { localClimaxReply, localCloseReply } from './engine/climax'
import './App.css'

function profileWithCatalog(profile: Profile, catalog: ContentCatalog): Profile {
  const selectedFetishes = catalog.fetishes.filter((item) => item.enabled && profile.fetishes.includes(item.id))
  const selectedEquipment = catalog.equipment.filter(
    (item) => item.enabled && planCanUseContent(profile.plan, item) && profile.equipment.includes(item.id),
  )
  return {
    ...profile,
    fetishLabels: selectedFetishes.map((item) => item.title),
    equipmentLabels: selectedEquipment.map((item) => item.prompt || item.title),
    equipmentEntries: selectedEquipment.map((item) => ({ id: item.id, label: item.prompt || item.title })),
    catalogPrompt: selectedFetishes.map((item) => item.prompt).filter(Boolean).join(' '),
  }
}

const emptyProfile = (): Profile => ({
  chatName: '',
  privacyMode: 'private',
  notificationStyle: 'discreet',
  sceneId: 'soft-care',
  role: 'slave',
  figure: 'mistress',
  userAnatomy: 'penis',
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
  extraPacks: false,
})

export default function App() {
  const [phase, setPhase] = useState<Phase>('age')
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState('')
  const [near, setNear] = useState<Nearness>('ok')
  const [cycle, setCycle] = useState(1)
  const [aftercareReason, setAftercareReason] = useState<'finish' | 'safeword'>('finish')
  const [running, setRunning] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [account, setAccount] = useState<Account | null>(() => currentAccount())
  const [returnPhase, setReturnPhase] = useState<Phase>('setup')
  const [decoyTaps, setDecoyTaps] = useState(0)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [rulesConfirmed, setRulesConfirmed] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [bodyOpen, setBodyOpen] = useState(false)
  const [bodyView, setBodyView] = useState<BodyView>('front')
  const [favoriteLook, setFavoriteLook] = useState<FavoriteLook | null>(null)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageNotice, setImageNotice] = useState('')
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
  const [savedSessionAvailable, setSavedSessionAvailable] = useState(false)
  const [panicDestination, setPanicDestination] = useState<PanicDestination>({ mode: 'decoy', customUrl: '' })
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
        if (!next) {
          setEntitlementLoaded(false)
          setFavoriteLook(null)
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
    let active = true
    void loadFavoriteLook(account.id).then((look) => {
      if (!active) return
      setFavoriteLook(look)
      setProfile((current) => ({
        ...current,
        partnerImageUrl: look?.imageUrl,
        ...(look ? { figure: look.figure } : {}),
      }))
    })
    return () => { active = false }
  }, [account])

  useEffect(() => {
    if (!account) return
    const privacyMode = loadPrivacyMode(account.id)
    const notificationStyle = loadNotificationStyle(account.id)
    const savedPanicDestination = loadPanicDestination(account.id)
    void hasDeviceSession(account.id).then((available) => {
      setSavedSessionAvailable(available)
      setProfile((current) => ({ ...current, privacyMode, notificationStyle }))
      setPanicDestination(savedPanicDestination)
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
      savedMediaBlobRef.current = null
      void clearDeviceSession(account.id).then(() => setSavedSessionAvailable(false))
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
    if (account && p.privacyMode === 'private') {
      void clearDeviceSession(account.id).then(() => setSavedSessionAvailable(false))
    }
    setLines([
      systemLine(scene ? scene.title : 'Scene start'),
      aiLine(openingPromptForPlan(scene, p.plan, p.nsfw)),
    ])
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
        profile: profileWithCatalog(profile, contentCatalog),
        near,
        cycle,
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
    } finally {
      if (aiRequestRef.current === controller) aiRequestRef.current = null
      setAiThinking(false)
    }
  }

  async function createPartnerImage() {
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
    try {
      const imageUrl = await generatePartnerImage({
        profile: profileWithCatalog(profile, contentCatalog),
        signal: controller.signal,
      })
      setProfile((current) => ({ ...current, partnerImageUrl: imageUrl }))
      setImageNotice(profile.privacyMode === 'device'
        ? 'Billedet er oprettet og gemmes kun på denne enhed.'
        : 'Billedet er oprettet og slettes, når den private session forlades.')
    } catch (error) {
      setImageNotice(error instanceof Error ? error.message : 'Billedet kunne ikke oprettes.')
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
      savedAt: new Date().toISOString(),
    }
    try {
      await saveFavoriteLook(look)
      setFavoriteLook(look)
      setImageNotice('Favoritten er gemt på denne enhed. Det bruger ikke et nyt figurbillede.')
    } catch {
      setImageNotice('Favoritten kunne ikke gemmes på denne enhed.')
    } finally {
      setFavoriteBusy(false)
    }
  }

  function useFavoriteLook() {
    if (!favoriteLook) return
    setProfile((current) => ({
      ...current,
      figure: favoriteLook.figure,
      partnerImageUrl: favoriteLook.imageUrl,
    }))
    setImageNotice('Din gemte favorit bruges igen uden billedforbrug.')
  }

  async function dropFavoriteLook() {
    if (!account || favoriteBusy) return
    setFavoriteBusy(true)
    try {
      await clearFavoriteLook(account.id)
      setFavoriteLook(null)
      setImageNotice('Favoritten er slettet fra denne enhed. Det viste billede bliver stående i denne session.')
    } catch {
      setImageNotice('Favoritten kunne ikke slettes fra denne enhed.')
    } finally {
      setFavoriteBusy(false)
    }
  }

  function tickSession(kind: 'close' | 'ok' | 'too' | 'deny' | 'finish' | 'safe') {
    aiRequestRef.current?.abort()
    setAiThinking(false)
    if (kind === 'safe') {
      setBodyOpen(false)
      setRunning(false)
      setAftercareReason('safeword')
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
      setBodyOpen(false)
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
    setBodyOpen(false)
    setAftercareReason('finish')
    push(youLine('Finish'), aiLine(onFinish(profile)))
    dropMedia()
    setPhase('aftercare')
  }

  async function sendAiRequest(
    text: string,
    intent: 'chat' | 'task' | 'touch' | 'close' | 'climax',
    visibleText = text,
    touchZone?: BodyZoneId,
  ) {
    if (!text || aiThinking) return
    if (!aiIsConfigured()) {
      push(
        youLine(visibleText),
        aiLine(
          intent === 'task'
            ? 'Opgaveknappen kræver, at AI-chatten er aktiv.'
            : intent === 'touch'
              ? 'Kropsfunktionen kræver, at AI-chatten er aktiv.'
              : intent === 'close'
                ? localCloseReply(profile)
                : intent === 'climax'
                  ? localClimaxReply(profile)
              : replyToText(profile, text, near),
        ),
      )
      return
    }

    const controller = new AbortController()
    aiRequestRef.current = controller
    setAiThinking(true)
    push(youLine(visibleText))
    try {
      const reply = await askAi({
        profile: profileWithCatalog(profile, contentCatalog),
        near,
        cycle,
        lines,
        text,
        intent,
        touchZone,
        signal: controller.signal,
      })
      push(aiLine(reply))
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Ukendt AI-fejl'
      push(systemLine(`AI kunne ikke svare: ${message}`))
      if (intent === 'chat') push(aiLine(replyToText(profile, text, near)))
      if (intent === 'close') push(aiLine(localCloseReply(profile)))
      if (intent === 'climax') push(aiLine(localClimaxReply(profile)))
    } finally {
      if (aiRequestRef.current === controller) aiRequestRef.current = null
      setAiThinking(false)
    }
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
    await sendAiRequest(t, 'chat')
  }

  async function requestTask() {
    await sendAiRequest(
      'Giv mig én konkret opgave, der fortsætter vores aktuelle samtale og passer til mine valg, grænser og mit udstyr.',
      'task',
      'Giv mig en opgave',
    )
  }

  async function touchBodyZone(zone: BodyZone) {
    if (aiThinking) return
    const visible = touchUserLine(zone)
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
    await sendAiRequest(visible, 'touch', visible, zone.id)
  }

  async function sendCloseMoment() {
    if (aiThinking) return
    setNear('close')
    setRunning(false)
    await sendAiRequest('Jeg er tæt på', 'close', 'Jeg er tæt på')
  }

  async function sendClimaxMoment() {
    if (aiThinking) return
    setNear('close')
    setRunning(false)
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
        <button className="ghost" style={{ marginTop: '1rem' }} onClick={() => setPhase('setup')}>
          Tilbage
        </button>
      </main>
    )
  }

  if (phase === 'setup') {
    const scenes = availableScenes(sceneCatalog, profile, contentCatalog)
    const selectedScene = scenes.find((scene) => scene.id === profile.sceneId) ?? scenes[0]
    const currentPlan = PLANS.find((item) => item.id === entitlement.plan) ?? PLANS[0]
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
                    : 'Eget valg'}
            </span>
          </summary>
          <div className="setup-fold-content panic-options">
            <p className="hint">Vælg hvad knappen “Noter” skal åbne. Et app-link åbner den tilhørende app, når mobilen understøtter det; ellers bruges browseren.</p>
            {([
              ['decoy', 'Diskrete noter', 'Bliv i Stay på en neutral noteside.'],
              ['weather', 'Vejret', 'Åbn en neutral vejrsøgning.'],
              ['calendar', 'Kalender', 'Åbn Google Kalender eller den tilknyttede app.'],
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
              {r === 'domme' ? 'Domme' : 'Slave'}
            </button>
          ))}
        </div>

        <h2>Din krop i chatten</h2>
        <p className="hint">
          Bruges kun til at tilpasse svarene fra “Tæt på” og “Jeg kommer”. Valget siger ikke noget om dit køn.
        </p>
        <div className="row">
          {([
            { id: 'penis' as UserAnatomy, title: 'Penis' },
            { id: 'vulva' as UserAnatomy, title: 'Vulva' },
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
            ? 'NSFW kræver Solo eller Plus'
            : profile.nsfw ? 'NSFW slået til — nøgen og direkte' : 'NSFW slået fra — tøjet på'}
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
          “Skab AI-partner” bruger billedmodellen, som admin har valgt til scenen. Hud og krop er kun figurens udseende.
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

        <section className="partner-image-builder" aria-live="polite">
          <div className={profile.partnerImageUrl ? 'generated-partner-image' : 'generated-partner-image empty'}>
            {profile.partnerImageUrl ? (
              <img
                src={profile.partnerImageUrl}
                alt={`Genereret billede af ${profile.figure === 'mistress' ? 'Mistress' : 'Master'}`}
              />
            ) : (
              <span>{profile.figure === 'mistress' ? 'M' : 'M'}</span>
            )}
          </div>
          <div>
            <h2>AI-partnerens billede</h2>
            <p className="hint">Billedet laves ud fra scene, stil, krop og de øvrige valg ovenfor.</p>
            <button
              type="button"
              className="primary"
              disabled={imageBusy || imageGenerationsLeft < 1}
              onClick={() => void createPartnerImage()}
            >
              {imageBusy ? 'Skaber billede…' : profile.partnerImageUrl ? 'Lav et nyt billede' : 'Skab AI-partner'}
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
                    ? 'Favorit gemt'
                    : favoriteLook
                      ? 'Erstat favorit'
                      : 'Gem som favorit'}
              </button>
              {favoriteLook && profile.partnerImageUrl !== favoriteLook.imageUrl && (
                <button type="button" className="ghost" disabled={favoriteBusy} onClick={useFavoriteLook}>
                  Brug favorit
                </button>
              )}
              {favoriteLook && (
                <button type="button" className="ghost" disabled={favoriteBusy} onClick={() => void dropFavoriteLook()}>
                  Slet favorit
                </button>
              )}
            </div>
            <small>{imageGenerationsLeft} figurbilleder tilbage</small>
            <p className="hint">Favoritten gemmes kun på denne enhed og bruger ikke et nyt billede.</p>
          </div>
        </section>
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
            <div className="equipment-grid">
              {contentCatalog.equipment
                .filter((item) => item.enabled && planCanUseContent(profile.plan, item))
                .map((item) => (
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
          </div>
        </details>

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
          {profile.partnerImageUrl === favoriteLook?.imageUrl && (
            <small className="portrait-empty-text">Favorit på denne enhed</small>
          )}
        </div>
        <div className="chat-tools">
          <button
            type="button"
            className={bodyOpen ? 'note-button active' : 'note-button'}
            aria-expanded={bodyOpen}
            onClick={() => setBodyOpen((open) => !open)}
          >
            {bodyOpen ? 'Luk krop' : 'Rør krop'}
          </button>
          <button className="note-button" onClick={panic}>Noter</button>
          <button className="safe" onClick={() => tickSession('safe')}>
            {profile.limits.safeword}
          </button>
        </div>
      </header>

      {bodyOpen && (
        <section className="body-board" aria-label="Berør AI-partnerens krop">
          <div className="body-board-head">
            <div>
              <strong>Rør ved {partnerName}</strong>
              <p>Tryk på en zone. Partneren reagerer i chatten.</p>
            </div>
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
      )}

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
          <span>{media.kind === 'image' && aiIsConfigured() ? 'Sendt til privat billedanalyse' : 'Kun på din telefon'}</span>
              <button type="button" onClick={dropMedia}>Skjul</button>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      <div className="chat-bottom">
        <div className="task-request">
          <button type="button" disabled={aiThinking} onClick={() => void requestTask()}>
            {aiThinking ? 'Partneren tænker…' : 'Giv mig en opgave'}
          </button>
          <span>Opgaven bygger på scenen og den aktuelle chat.</span>
        </div>
        <div className="session-actions" aria-label="Hurtige scenevalg">
          <button disabled={aiThinking} onClick={() => void sendCloseMoment()}>Tæt på</button>
          <button className="finish" disabled={aiThinking} onClick={() => void sendClimaxMoment()}>Jeg kommer</button>
          <button onClick={() => tickSession('ok')}>Igen</button>
          <button onClick={() => tickSession('too')}>For meget</button>
          <button onClick={() => tickSession('deny')}>Nægt</button>
          <button className="finish" onClick={() => tickSession('finish')}>Aftercare</button>
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
    </main>
  )
}
