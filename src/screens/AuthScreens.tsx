import { useEffect, useState } from 'react'
import type { Account } from '../engine/auth'
import {
  currentAccount,
  loadRememberedEmail,
  loadAccounts,
  loginAsync,
  logout,
  registerAsync,
  requestPasswordReset,
  setAccountPlan,
  setAccountStatus,
} from '../engine/auth'
import { firebaseReady } from '../engine/firebase'
import { PLANS, type PlanId } from '../engine/plans'
import { AI_MODELS, DEFAULT_SCENES, IMAGE_MODELS, VISION_MODELS, observeScenes, publishScenes } from '../engine/scenes'
import {
  DEFAULT_CONTENT_CATALOG,
  newContentOption,
  observeContentCatalog,
  publishContentCatalog,
  type ContentCatalog,
  type ContentOption,
} from '../engine/contentCatalog'
import {
  DEFAULT_USAGE_CONFIG,
  approvePurchase,
  currentUsagePeriod,
  entitlementIsExpired,
  observeCustomerAccounts,
  observePurchaseRequests,
  observeUsageConfig,
  observeUsageDashboard,
  publishUsageConfig,
  rejectPurchase,
  updateUserEntitlement,
  type CustomerAccount,
  type PurchaseRequest,
  type UsageConfig,
  type UsageDashboardRow,
} from '../engine/usage'

export function LoginScreen({
  onIn,
  onAdmin,
}: {
  onIn: (acc: Account) => void
  onAdmin: () => void
}) {
  const [email, setEmail] = useState(() => loadRememberedEmail())
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function go() {
    if (mode === 'up' && password !== confirmPassword) {
      setErr('Adgangskoderne er ikke ens.')
      return
    }
    setBusy(true)
    setErr('')
    setNotice('')
    const res = mode === 'in' ? await loginAsync(email, password) : await registerAsync(email, password)
    setBusy(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    if ('notice' in res) {
      setNotice(res.notice)
      setMode('in')
      setPassword('')
      setConfirmPassword('')
      return
    }
    if (res.account.role === 'admin') onAdmin()
    else onIn(res.account)
  }

  return (
    <main className="login-split">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">S</span>
          Stay
        </div>
        <div className="login-copy">
          <p className="kicker">Sikker adgang</p>
          <h1>{mode === 'in' ? 'Velkommen tilbage' : 'Opret din konto'}</h1>
          <p className="lede">
            {mode === 'in' ? 'Log ind for at fortsætte til Stay.' : 'Din konto skal bekræftes via e-mail.'}
          </p>
        </div>
        <div className="login-tabs" role="tablist" aria-label="Login eller opret konto">
          <button
            type="button"
            className={mode === 'in' ? 'chip on' : 'chip'}
            onClick={() => { setMode('in'); setErr(''); setNotice('') }}
          >
            Log ind
          </button>
          <button
            type="button"
            className={mode === 'up' ? 'chip on' : 'chip'}
            onClick={() => { setMode('up'); setErr(''); setNotice('') }}
          >
            Opret konto
          </button>
        </div>
        <form
          autoComplete="on"
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
        >
          <label className="field">
            Email
            <input
              id="stay-login-email"
              name="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              required
            />
          </label>
          <label className="field">
            Adgangskode
            <input
              id="stay-login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              minLength={mode === 'up' ? 8 : undefined}
              required
            />
          </label>
          {mode === 'up' && (
            <>
              <label className="field">
                Gentag adgangskode
                <input
                  id="stay-login-password-confirm"
                  name="password-confirmation"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </>
          )}
          {err && <p className="form-message">{err}</p>}
          {notice && <p className="form-message success">{notice}</p>}
          <button className="primary login-btn" disabled={busy}>
            {busy ? 'Arbejder…' : mode === 'in' ? 'Log ind →' : 'Opret konto →'}
          </button>
          {mode === 'in' && (
            <button
              type="button"
              className="reset-link"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setErr('')
                setNotice(await requestPasswordReset(email))
                setBusy(false)
              }}
            >
              Glemt adgangskode?
            </button>
          )}
        </form>
        <p className="hint">
          {firebaseReady() ? 'Stay · Firebase-login · e-mailbekræftelse' : 'Stay · demo-login · admin@stay.local / admin'}
        </p>
      </section>
      <section className="login-visual">
        <p className="kicker">Stay</p>
        <h2>
          Hold kanten.
          <br />
          Du kommer når der siges til.
        </h2>
      </section>
    </main>
  )
}

export function AdminScreen({ onBack }: { onBack: () => void }) {
  type AdminTab = 'kunder' | 'tal' | 'forbrug' | 'prompts' | 'indhold' | 'indstillinger'
  const [tab, setTab] = useState<AdminTab>('tal')
  const [menuOpen, setMenuOpen] = useState(false)
  const [, setTick] = useState(0)
  const [scenes, setScenes] = useState(DEFAULT_SCENES)
  const [selectedSceneId, setSelectedSceneId] = useState(DEFAULT_SCENES[0]?.id ?? '')
  const [sceneNotice, setSceneNotice] = useState('')
  const [sceneSaving, setSceneSaving] = useState(false)
  const [usageConfig, setUsageConfig] = useState<UsageConfig>(DEFAULT_USAGE_CONFIG)
  const [usageRows, setUsageRows] = useState<UsageDashboardRow[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [usageNotice, setUsageNotice] = useState('')
  const [usageSaving, setUsageSaving] = useState(false)
  const [contentCatalog, setContentCatalog] = useState<ContentCatalog>(DEFAULT_CONTENT_CATALOG)
  const [contentNotice, setContentNotice] = useState('')
  const [contentSaving, setContentSaving] = useState(false)
  const [wordQuery, setWordQuery] = useState('')
  const [customers, setCustomers] = useState<CustomerAccount[]>([])
  const [customerNotice, setCustomerNotice] = useState('')
  const localCustomers: CustomerAccount[] = loadAccounts().map((account) => ({
    id: account.id,
    email: account.email,
    chatName: '',
    createdAt: account.createdAt,
    lastSeen: account.lastSeen,
    plan: account.plan,
    status: account.status,
    expiresAt: null,
    extraPacks: false,
    bonusPeriod: currentUsagePeriod(),
    bonusImageGenerations: 0,
    bonusImageAnalyses: 0,
  }))
  const list = firebaseReady() ? customers : localCustomers
  const active = list.filter((a) => a.status === 'active' && !entitlementIsExpired(a))
  const gone = list.filter((a) => a.status === 'cancelled' || a.status === 'churned')
  const mrr = active.reduce((sum, a) => sum + (PLANS.find((p) => p.id === a.plan)?.dkkMonth ?? 0), 0)

  useEffect(() => observeScenes(setScenes), [])
  useEffect(() => observeUsageConfig(setUsageConfig), [])
  useEffect(() => observeUsageDashboard(setUsageRows), [])
  useEffect(() => observePurchaseRequests(setPurchaseRequests), [])
  useEffect(() => observeContentCatalog(setContentCatalog), [])
  useEffect(() => observeCustomerAccounts(setCustomers), [])
  useEffect(() => {
    function closeMenu(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeMenu)
    return () => window.removeEventListener('keydown', closeMenu)
  }, [])

  function openSection(next: AdminTab) {
    setTab(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function refresh() {
    setTick((n) => n + 1)
  }

  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId)
  const currentUsageRows = usageRows.filter((row) => row.period === currentUsagePeriod())
  function remainingImages(customer: CustomerAccount): number {
    const used = currentUsageRows.find((row) => row.uid === customer.id)?.imageGenerations ?? 0
    const limits = customer.plan === 'plus'
      ? usageConfig.plusImageGenerationsMonthly
      : customer.plan === 'solo'
        ? usageConfig.soloImageGenerationsMonthly
        : usageConfig.freeImageGenerationsMonthly
    const bonus = customer.bonusPeriod === currentUsagePeriod() ? customer.bonusImageGenerations : 0
    return Math.max(0, limits + bonus - used)
  }

  async function changeCustomerPlan(customer: CustomerAccount, plan: PlanId) {
    setCustomerNotice('')
    try {
      if (firebaseReady()) {
        await updateUserEntitlement(customer.id, { plan })
      } else {
        const localPlan = PLANS.find((item) => item.id === plan)!
        setAccountPlan(customer.id, plan, localPlan.images)
        refresh()
      }
      setCustomerNotice(`${customer.email || customer.id} er ændret til ${plan}.`)
    } catch (error) {
      setCustomerNotice(error instanceof Error ? error.message : 'Planen kunne ikke ændres.')
    }
  }

  async function changeCustomerStatus(customer: CustomerAccount, status: CustomerAccount['status']) {
    setCustomerNotice('')
    try {
      if (firebaseReady()) {
        await updateUserEntitlement(customer.id, { status })
      } else {
        setAccountStatus(customer.id, status)
        refresh()
      }
      setCustomerNotice(`${customer.email || customer.id}: ${status}.`)
    } catch (error) {
      setCustomerNotice(error instanceof Error ? error.message : 'Status kunne ikke ændres.')
    }
  }
  const modelTotals = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>()
  for (const row of currentUsageRows) {
    for (const [model, stats] of Object.entries(row.models)) {
      const total = modelTotals.get(model) || { calls: 0, inputTokens: 0, outputTokens: 0 }
      total.calls += stats.calls
      total.inputTokens += stats.inputTokens
      total.outputTokens += stats.outputTokens
      modelTotals.set(model, total)
    }
  }
  const pendingPurchases = purchaseRequests.filter((item) => item.status === 'pending')
  const usagePlans: Array<{
    id: PlanId
    title: string
    chat: keyof UsageConfig
    generation: keyof UsageConfig
    analysis: keyof UsageConfig
  }> = [
    { id: 'free', title: 'Prøv', chat: 'freeChatDaily', generation: 'freeImageGenerationsMonthly', analysis: 'freeImageAnalysesMonthly' },
    { id: 'solo', title: 'Solo', chat: 'soloChatDaily', generation: 'soloImageGenerationsMonthly', analysis: 'soloImageAnalysesMonthly' },
    { id: 'plus', title: 'Plus', chat: 'plusChatDaily', generation: 'plusImageGenerationsMonthly', analysis: 'plusImageAnalysesMonthly' },
  ]

  function updateSelected(patch: Partial<NonNullable<typeof selectedScene>>) {
    setSceneNotice('')
    setScenes((current) =>
      current.map((scene) => (scene.id === selectedSceneId ? { ...scene, ...patch } : scene)),
    )
  }

  function updateContentOption(
    kind: 'equipment' | 'fetishes' | 'words' | 'wordsMinus',
    id: string,
    patch: Partial<ContentOption>,
  ) {
    setContentNotice('')
    setContentCatalog((current) => ({
      ...current,
      [kind]: current[kind].map((item) => item.id === id ? { ...item, ...patch } : item),
    }))
  }

  function addContentOption(kind: 'equipment' | 'fetishes' | 'words' | 'wordsMinus') {
    setContentNotice('')
    if (kind === 'words' || kind === 'wordsMinus') setWordQuery('')
    setContentCatalog((current) => ({
      ...current,
      [kind]: kind === 'words' || kind === 'wordsMinus'
        ? [
            newContentOption('word', 0),
            ...current[kind].map((item, order) => ({ ...item, order: order + 1 })),
          ]
        : [
            ...current[kind],
            newContentOption(kind === 'equipment' ? 'equipment' : 'fetish', current[kind].length),
          ],
    }))
    if (kind === 'words' || kind === 'wordsMinus') {
      window.requestAnimationFrame(() => {
        const list = document.querySelector<HTMLElement>(`[data-word-list="${kind}"]`)
        list?.scrollTo({ top: 0, behavior: 'smooth' })
        list?.querySelector<HTMLInputElement>('input')?.focus()
      })
    }
  }

  function removeContentOption(kind: 'equipment' | 'fetishes' | 'words' | 'wordsMinus', id: string) {
    const item = contentCatalog[kind].find((option) => option.id === id)
    if (!item || !window.confirm(`Slet “${item.title}”? Ændringen gælder først, når du gemmer.`)) return
    setContentNotice('')
    setContentCatalog((current) => ({
      ...current,
      [kind]: current[kind]
        .filter((option) => option.id !== id)
        .map((option, order) => ({ ...option, order })),
    }))
  }

  return (
    <main className="shell-wide admin-shell">
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="stay-admin-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
          Menu
        </button>
        <div>
          <p className="kicker">Stay admin</p>
          <h1>Kontrolpanel</h1>
          <p className="hint">Vælg et område i sidemenuen. Ændringer udgives centralt til hele appen.</p>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="admin-menu-backdrop"
          aria-label="Luk administratormenu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="stay-admin-menu" className={menuOpen ? 'admin-sidebar open' : 'admin-sidebar'} aria-hidden={!menuOpen}>
        <div className="admin-sidebar-head">
          <div>
            <p className="kicker">Stay</p>
            <strong>Administration</strong>
          </div>
          <button type="button" aria-label="Luk menu" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <nav className="admin-side-nav" aria-label="Administrationsområder">
          <button className={tab === 'tal' ? 'active' : ''} onClick={() => openSection('tal')}>
            <span>Overblik</span><small>Tal og drift</small>
          </button>
          <button className={tab === 'kunder' ? 'active' : ''} onClick={() => openSection('kunder')}>
            <span>Kunder</span><small>Plan, saldo og status</small>
          </button>
          <button className={tab === 'prompts' ? 'active' : ''} onClick={() => openSection('prompts')}>
            <span>AI &amp; prompts</span><small>Tekst- og billedmodeller</small>
          </button>
          <button className={tab === 'forbrug' ? 'active' : ''} onClick={() => openSection('forbrug')}>
            <span>Priser &amp; grænser</span><small>Kvoter, køb og forbrug</small>
          </button>
          <button className={tab === 'indhold' ? 'active' : ''} onClick={() => openSection('indhold')}>
            <span>Indhold</span><small>Udstyr og temaer</small>
          </button>
          <button className={tab === 'indstillinger' ? 'active' : ''} onClick={() => openSection('indstillinger')}>
            <span>Indstillinger</span><small>Forbindelse og konto</small>
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <button className="ghost" onClick={onBack}>Åbn bruger-app</button>
          <button
            className="ghost"
            onClick={() => {
              logout()
              onBack()
            }}
          >
            Log ud
          </button>
        </div>
      </aside>

      {tab === 'kunder' && (
        <div>
          <p className="hint">
            Plan, billedsaldo, pause og udløb læses direkte fra Firestore. Ændringer gælder straks i appen og Workeren.
          </p>
          {customerNotice && <p className="form-message success">{customerNotice}</p>}
          <div className="table-wrap">
            <table className="admin customer-table">
              <thead>
                <tr>
                  <th>Konto</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Billeder</th>
                  <th>Udløber</th>
                  <th>Sidst set</th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {list.map((customer) => {
                  const expired = entitlementIsExpired(customer)
                  return (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.email || 'E-mail mangler'}</strong>
                        {customer.chatName && <div className="hint">Chatnavn: {customer.chatName}</div>}
                        <div className="hint">{customer.id}</div>
                      </td>
                      <td>
                        {(['free', 'solo', 'plus'] as PlanId[]).map((plan) => (
                          <button
                            key={plan}
                            className={customer.plan === plan ? 'chip on' : 'chip'}
                            onClick={() => void changeCustomerPlan(customer, plan)}
                          >
                            {plan}
                          </button>
                        ))}
                      </td>
                      <td>
                        <strong className={customer.status === 'active' && !expired ? 'ok' : 'warn'}>
                          {expired ? 'udløbet' : customer.status}
                        </strong>
                      </td>
                      <td>
                        <strong>{remainingImages(customer)} tilbage</strong>
                        <label className="mini-field">
                          Ekstra denne måned
                          <input
                            type="number"
                            min="0"
                            defaultValue={customer.bonusImageGenerations}
                            onBlur={(event) => void updateUserEntitlement(customer.id, {
                              bonusImageGenerations: Math.max(0, Number(event.target.value)),
                            })}
                          />
                        </label>
                      </td>
                      <td>
                        <input
                          className="date-input"
                          type="date"
                          value={customer.expiresAt?.slice(0, 10) || ''}
                          onChange={(event) => void updateUserEntitlement(customer.id, {
                            expiresAt: event.target.value ? `${event.target.value}T23:59:59.999Z` : null,
                          })}
                        />
                        <small className="hint">Tom = intet udløb</small>
                      </td>
                      <td>{customer.lastSeen ? new Date(customer.lastSeen).toLocaleString('da-DK') : 'Ikke registreret'}</td>
                      <td>
                        <button className="ghost" onClick={() => void changeCustomerStatus(customer, 'paused')}>Pause</button>
                        <button className="ghost" onClick={() => void changeCustomerStatus(customer, 'cancelled')}>Opsig</button>
                        <button className="safe" onClick={() => void changeCustomerStatus(customer, 'churned')}>Churn</button>
                        <button className="chip on" onClick={() => void changeCustomerStatus(customer, 'active')}>Aktiv</button>
                      </td>
                    </tr>
                  )
                })}
                {list.length === 0 && (
                  <tr><td colSpan={7}>Ingen Firestore-kunder fundet endnu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tal' && (
        <div>
          <div className="stats">
            <div className="stat"><b>{active.length}</b>aktive</div>
            <div className="stat"><b>{gone.length}</b>afgang</div>
            <div className="stat"><b>{mrr} kr</b>MRR mock</div>
            <div className="stat"><b>{list.length}</b>konti</div>
          </div>
          <section className="sheet">
            <h2>Afgang</h2>
            <p className="lede">
              Opsagt er et aktivt stop. Churn er udebleven fornyelse. Senere fyldes det fra betalings-webhook.
            </p>
            <p className="hint">
              Mock MRR tæller kun aktive planer til listepris. Gebyr og Venice-kost er ikke trukket fra.
            </p>
          </section>
        </div>
      )}

      {tab === 'forbrug' && (
        <section className="usage-admin">
          <div className="sheet">
            <p className="kicker">Centrale grænser</p>
            <h2>Forbrug pr. abonnement</h2>
            <p className="hint">Chat nulstilles dagligt. Billedgenerering og billedanalyse nulstilles månedligt.</p>
            <div className="limit-grid">
              {usagePlans.map((plan) => (
                <fieldset key={plan.id}>
                  <legend>{plan.title}</legend>
                  <label className="field">
                    Chat pr. dag
                    <input
                      type="number"
                      min="0"
                      value={usageConfig[plan.chat]}
                      onChange={(e) => setUsageConfig({ ...usageConfig, [plan.chat]: Math.max(0, Number(e.target.value)) })}
                    />
                  </label>
                  <label className="field">
                    Billeder pr. måned
                    <input
                      type="number"
                      min="0"
                      value={usageConfig[plan.generation]}
                      onChange={(e) => setUsageConfig({ ...usageConfig, [plan.generation]: Math.max(0, Number(e.target.value)) })}
                    />
                  </label>
                  <label className="field">
                    Billedanalyser pr. måned
                    <input
                      type="number"
                      min="0"
                      value={usageConfig[plan.analysis]}
                      onChange={(e) => setUsageConfig({ ...usageConfig, [plan.analysis]: Math.max(0, Number(e.target.value)) })}
                    />
                  </label>
                </fieldset>
              ))}
            </div>
            <button
              className="primary"
              disabled={usageSaving}
              onClick={async () => {
                setUsageSaving(true)
                setUsageNotice('')
                try {
                  await publishUsageConfig(usageConfig)
                  setUsageNotice('Forbrugsgrænserne er udgivet og gælder straks for alle brugere.')
                } catch (error) {
                  setUsageNotice(error instanceof Error ? error.message : 'Grænserne kunne ikke gemmes.')
                } finally {
                  setUsageSaving(false)
                }
              }}
            >
              {usageSaving ? 'Gemmer…' : 'Gem grænser'}
            </button>
            {usageNotice && <p className="form-message success">{usageNotice}</p>}
          </div>

          <div className="sheet">
            <p className="kicker">Manuel betaling indtil webhook</p>
            <h2>Afventende køb ({pendingPurchases.length})</h2>
            {pendingPurchases.length === 0 && <p className="hint">Ingen køb afventer.</p>}
            {pendingPurchases.map((request) => (
              <div className="purchase-row" key={request.id}>
                <div>
                  <strong>{request.email || request.uid}</strong>
                  <p>{request.title} · {request.priceDkk} kr</p>
                </div>
                <div className="row">
                  <button
                    className="chip on"
                    onClick={async () => {
                      try {
                        await approvePurchase(request)
                        setUsageNotice(`${request.title} er godkendt for ${request.email}.`)
                      } catch (error) {
                        setUsageNotice(error instanceof Error ? error.message : 'Købet kunne ikke godkendes.')
                      }
                    }}
                  >
                    Godkend
                  </button>
                  <button className="ghost" onClick={() => void rejectPurchase(request.id)}>Afvis</button>
                </div>
              </div>
            ))}
          </div>

          <div className="sheet">
            <p className="kicker">{currentUsagePeriod()}</p>
            <h2>Samlet AI-forbrug</h2>
            <div className="stats compact">
              <div className="stat"><b>{currentUsageRows.reduce((sum, row) => sum + row.chatMonth, 0)}</b>chatkald</div>
              <div className="stat"><b>{currentUsageRows.reduce((sum, row) => sum + row.imageGenerations, 0)}</b>billeder</div>
              <div className="stat"><b>{currentUsageRows.reduce((sum, row) => sum + row.imageAnalyses, 0)}</b>analyser</div>
            </div>
            <div className="table-wrap">
              <table className="admin">
                <thead><tr><th>AI-model</th><th>Kald</th><th>Input tokens</th><th>Output tokens</th></tr></thead>
                <tbody>
                  {[...modelTotals.entries()].sort((a, b) => b[1].calls - a[1].calls).map(([model, stats]) => (
                    <tr key={model}>
                      <td>{model}</td>
                      <td>{stats.calls}</td>
                      <td>{stats.inputTokens.toLocaleString('da-DK')}</td>
                      <td>{stats.outputTokens.toLocaleString('da-DK')}</td>
                    </tr>
                  ))}
                  {modelTotals.size === 0 && <tr><td colSpan={4}>Ingen registreret AI-brug endnu.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'prompts' && (
        <section className="prompt-admin">
          <aside className="prompt-list">
            <h2>Scenevalg</h2>
            {scenes.map((scene) => (
              <button
                key={scene.id}
                className={scene.id === selectedSceneId ? 'prompt-item on' : 'prompt-item'}
                onClick={() => { setSelectedSceneId(scene.id); setSceneNotice('') }}
              >
                <strong>{scene.title}</strong>
                <span>{scene.enabled ? scene.textModel : 'Deaktiveret'}</span>
              </button>
            ))}
          </aside>

          {selectedScene && (
            <div className="prompt-editor">
              <div className="row prompt-heading">
                <div>
                  <p className="kicker">Prompt-editor</p>
                  <h2>{selectedScene.title}</h2>
                </div>
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={selectedScene.enabled}
                    onChange={(e) => updateSelected({ enabled: e.target.checked })}
                  />
                  Aktiv
                </label>
              </div>

              <label className="field">
                Navn på knappen
                <input value={selectedScene.title} onChange={(e) => updateSelected({ title: e.target.value })} />
              </label>
              <label className="field">
                Kort beskrivelse
                <input value={selectedScene.blurb} onChange={(e) => updateSelected({ blurb: e.target.value })} />
              </label>
              <label className="field">
                Tekstmodel
                <select value={selectedScene.textModel} onChange={(e) => updateSelected({ textModel: e.target.value })}>
                  {AI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>{model.title}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Billedmodel
                <select value={selectedScene.imageModel} onChange={(e) => updateSelected({ imageModel: e.target.value })}>
                  {IMAGE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>{model.title}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Billedanalyse
                <select value={selectedScene.visionModel} onChange={(e) => updateSelected({ visionModel: e.target.value })}>
                  {VISION_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>{model.title}</option>
                  ))}
                </select>
              </label>
              <details className="prompt-layer" open>
                <summary>Blød / SFW — alle planer</summary>
                <label className="field">
                  Startbesked
                  <textarea rows={3} value={selectedScene.openingPrompt} onChange={(e) => updateSelected({ openingPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Systemprompt
                  <textarea rows={8} value={selectedScene.systemPrompt} onChange={(e) => updateSelected({ systemPrompt: e.target.value })} />
                </label>
                <label className="field">
                  “Giv mig en opgave”
                  <textarea rows={5} value={selectedScene.taskPrompt} onChange={(e) => updateSelected({ taskPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Billedprompt
                  <textarea rows={4} value={selectedScene.imagePrompt} onChange={(e) => updateSelected({ imagePrompt: e.target.value })} />
                </label>
              </details>

              <details className="prompt-layer">
                <summary>Fræk / NSFW — Solo og Plus</summary>
                <label className="field">
                  Startbesked
                  <textarea rows={3} value={selectedScene.nsfwOpeningPrompt} onChange={(e) => updateSelected({ nsfwOpeningPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Ekstra systemprompt
                  <textarea rows={8} value={selectedScene.nsfwSystemPrompt} onChange={(e) => updateSelected({ nsfwSystemPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Ekstra opgaveprompt
                  <textarea rows={5} value={selectedScene.nsfwTaskPrompt} onChange={(e) => updateSelected({ nsfwTaskPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Ekstra billedprompt
                  <textarea rows={4} value={selectedScene.nsfwImagePrompt} onChange={(e) => updateSelected({ nsfwImagePrompt: e.target.value })} />
                </label>
              </details>

              <details className="prompt-layer">
                <summary>Plus — kun Firestore-plan Plus + NSFW</summary>
                <label className="field">
                  Startbesked
                  <textarea rows={3} value={selectedScene.plusOpeningPrompt} onChange={(e) => updateSelected({ plusOpeningPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Ekstra systemprompt
                  <textarea rows={8} value={selectedScene.plusSystemPrompt} onChange={(e) => updateSelected({ plusSystemPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Ekstra opgaveprompt
                  <textarea rows={5} value={selectedScene.plusTaskPrompt} onChange={(e) => updateSelected({ plusTaskPrompt: e.target.value })} />
                </label>
                <label className="field">
                  Ekstra billedprompt
                  <textarea rows={4} value={selectedScene.plusImagePrompt} onChange={(e) => updateSelected({ plusImagePrompt: e.target.value })} />
                </label>
                <span className="hint">Workeren afgør Plus ud fra Firestore. Browseren kan ikke selv slå laget til.</span>
              </details>
              {selectedScene.requiredFetish && (
                <p className="hint">Vises kun, når pakken “{selectedScene.requiredFetish}” er valgt og låst op.</p>
              )}
              <p className="hint">
                De faste 18+, samtykke- og sikkerhedsregler ligger i Workeren og kan ikke fjernes her.
              </p>
              {sceneNotice && <p className="form-message success">{sceneNotice}</p>}
              <div className="row">
                <button
                  className="primary"
                  disabled={sceneSaving}
                  onClick={async () => {
                    setSceneSaving(true)
                    setSceneNotice('')
                    try {
                      await publishScenes(scenes)
                      setSceneNotice('Ændringerne er udgivet til alle brugere.')
                    } catch (error) {
                      setSceneNotice(error instanceof Error ? error.message : 'Kunne ikke gemme centralt.')
                    } finally {
                      setSceneSaving(false)
                    }
                  }}
                >
                  {sceneSaving ? 'Udgiver…' : 'Udgiv til alle'}
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const defaults = structuredClone(DEFAULT_SCENES)
                    setScenes(defaults)
                    setSelectedSceneId(defaults[0]?.id ?? '')
                    setSceneNotice('Standardværdier er indlæst. Tryk “Udgiv til alle” for at gemme dem.')
                  }}
                >
                  Gendan standard
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'indhold' && (
        <section className="catalog-admin">
          <div className="sheet catalog-intro">
            <p className="kicker">Centralt indhold</p>
            <h2>Udstyr og temaer</h2>
            <p className="lede">
              Tilføj, redigér, deaktiver eller slet felterne. Når du gemmer, slår ændringen igennem hos alle brugere.
            </p>
            <p className="hint">
              Deaktiver et felt, hvis det måske skal bruges igen. Sletning fjerner det fra brugerens næste opsætning.
              De faste 18+ og sikkerhedsregler kan ikke ændres her.
            </p>
            <div className="row">
              <button
                className="primary"
                disabled={contentSaving}
                onClick={async () => {
                  setContentSaving(true)
                  setContentNotice('')
                  try {
                    await publishContentCatalog(contentCatalog)
                    setContentNotice('Udstyr og temaer er udgivet til alle brugere.')
                  } catch (error) {
                    setContentNotice(error instanceof Error ? error.message : 'Indholdet kunne ikke gemmes.')
                  } finally {
                    setContentSaving(false)
                  }
                }}
              >
                {contentSaving ? 'Gemmer…' : 'Gem og udgiv til alle'}
              </button>
              <button
                className="ghost"
                onClick={() => {
                  setContentCatalog(structuredClone(DEFAULT_CONTENT_CATALOG))
                  setContentNotice('Standardfelterne er indlæst. Tryk “Gem og udgiv til alle” for at gemme dem.')
                }}
              >
                Gendan standard
              </button>
            </div>
            {contentNotice && <p className="form-message success">{contentNotice}</p>}
          </div>

          <details className="sheet catalog-fold lexicon-pack">
            <summary className="catalog-heading">
              <div>
                <p className="kicker">Kun admin</p>
                <h2>Ordbog</h2>
                <small>{contentCatalog.words.length + contentCatalog.wordsMinus.length} ord · tryk for at åbne</small>
              </div>
            </summary>
            <p className="hint">Brugerne ser ikke listerne. Chatten får kun de aktive ord efter “Gem og udgiv”.</p>
            <label className="field">
              Søg i listerne
              <input value={wordQuery} placeholder="Søg efter et ord…" onChange={(event) => setWordQuery(event.target.value)} />
            </label>
            <details className="catalog-fold inner-fold">
              <summary className="catalog-heading">
                <div>
                  <h2>Frække ord</h2>
                  <small>{contentCatalog.words.length} plus</small>
                </div>
                <button type="button" className="chip on" onClick={(event) => { event.preventDefault(); addContentOption('words') }}>+ Tilføj ord</button>
              </summary>
              <div className="catalog-list catalog-list-words" data-word-list="words" data-scroll-top-target>
                {contentCatalog.words.filter((item) => !wordQuery.trim() || `${item.title} ${item.prompt}`.toLowerCase().includes(wordQuery.trim().toLowerCase())).map((item) => (
                  <article className="catalog-row word-row" key={item.id}>
                    <label className="field">
                      Ord
                      <input value={item.title} maxLength={40} onChange={(event) => updateContentOption('words', item.id, { title: event.target.value })} />
                    </label>
                    <label className="field">
                      Betydning
                      <input value={item.prompt} maxLength={160} onChange={(event) => updateContentOption('words', item.id, { prompt: event.target.value })} />
                    </label>
                    <label className="toggle-field">
                      <input type="checkbox" checked={item.enabled} onChange={(event) => updateContentOption('words', item.id, { enabled: event.target.checked })} />
                      Aktiv
                    </label>
                    <button className="safe" onClick={() => removeContentOption('words', item.id)}>Slet</button>
                  </article>
                ))}
              </div>
            </details>
            <details className="catalog-fold inner-fold">
              <summary className="catalog-heading">
                <div>
                  <h2>Brug ikke</h2>
                  <small>{contentCatalog.wordsMinus.length} minus</small>
                </div>
                <button type="button" className="chip on" onClick={(event) => { event.preventDefault(); addContentOption('wordsMinus') }}>+ Tilføj forbud</button>
              </summary>
              <div className="catalog-list catalog-list-words" data-word-list="wordsMinus" data-scroll-top-target>
                {contentCatalog.wordsMinus.filter((item) => !wordQuery.trim() || `${item.title} ${item.prompt}`.toLowerCase().includes(wordQuery.trim().toLowerCase())).map((item) => (
                  <article className="catalog-row word-row" key={item.id}>
                    <label className="field">
                      Ord
                      <input value={item.title} maxLength={40} onChange={(event) => updateContentOption('wordsMinus', item.id, { title: event.target.value })} />
                    </label>
                    <label className="field">
                      Erstat med
                      <input value={item.prompt} maxLength={160} onChange={(event) => updateContentOption('wordsMinus', item.id, { prompt: event.target.value })} />
                    </label>
                    <label className="toggle-field">
                      <input type="checkbox" checked={item.enabled} onChange={(event) => updateContentOption('wordsMinus', item.id, { enabled: event.target.checked })} />
                      Aktiv
                    </label>
                    <button className="safe" onClick={() => removeContentOption('wordsMinus', item.id)}>Slet</button>
                  </article>
                ))}
              </div>
            </details>
          </details>

          <details className="sheet catalog-fold">
            <summary className="catalog-heading">
              <div>
                <p className="kicker">Afkrydsningsfelter</p>
                <h2>Udstyr</h2>
                <small>{contentCatalog.equipment.length} felter · tryk for at åbne</small>
              </div>
              <button type="button" className="chip on" onClick={(event) => { event.preventDefault(); addContentOption('equipment') }}>+ Tilføj udstyr</button>
            </summary>
            <div className="catalog-list">
              {contentCatalog.equipment.map((item) => (
                <article className="catalog-row" key={item.id}>
                  <label className="field">
                    Navn hos brugeren
                    <input
                      value={item.title}
                      maxLength={80}
                      onChange={(e) => updateContentOption('equipment', item.id, { title: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Gruppe
                    <input
                      value={item.group}
                      maxLength={80}
                      onChange={(e) => updateContentOption('equipment', item.id, { group: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Mindste plan
                    <select
                      value={item.minimumPlan}
                      onChange={(e) => updateContentOption('equipment', item.id, {
                        minimumPlan: e.target.value as PlanId,
                        free: e.target.value === 'free',
                      })}
                    >
                      <option value="free">Prøv</option>
                      <option value="solo">Solo</option>
                      <option value="plus">Plus</option>
                    </select>
                  </label>
                  <label className="field">
                    Ord sendt til AI
                    <input
                      value={item.prompt}
                      maxLength={160}
                      placeholder={item.title}
                      onChange={(e) => updateContentOption('equipment', item.id, { prompt: e.target.value })}
                    />
                  </label>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => updateContentOption('equipment', item.id, { enabled: e.target.checked })}
                    />
                    Aktiv
                  </label>
                  <button className="safe" onClick={() => removeContentOption('equipment', item.id)}>Slet</button>
                  <small className="catalog-id">ID: {item.id}</small>
                </article>
              ))}
            </div>
          </details>

          <details className="sheet catalog-fold">
            <summary className="catalog-heading">
              <div>
                <p className="kicker">Kort og AI-adfærd</p>
                <h2>Temaer / fetish</h2>
                <small>{contentCatalog.fetishes.length} felter · tryk for at åbne</small>
              </div>
              <button type="button" className="chip on" onClick={(event) => { event.preventDefault(); addContentOption('fetishes') }}>+ Tilføj tema</button>
            </summary>
            <div className="catalog-list">
              {contentCatalog.fetishes.map((item) => (
                <article className="catalog-row fetish-editor" key={item.id}>
                  <label className="field">
                    Navn på kortet
                    <input
                      value={item.title}
                      maxLength={80}
                      onChange={(e) => updateContentOption('fetishes', item.id, { title: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Kort beskrivelse
                    <input
                      value={item.blurb}
                      maxLength={180}
                      onChange={(e) => updateContentOption('fetishes', item.id, { blurb: e.target.value })}
                    />
                  </label>
                  <label className="field catalog-prompt-field">
                    Instruktion til AI, når temaet er valgt
                    <textarea
                      rows={3}
                      value={item.prompt}
                      maxLength={600}
                      onChange={(e) => updateContentOption('fetishes', item.id, { prompt: e.target.value })}
                    />
                  </label>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={item.free}
                      onChange={(e) => updateContentOption('fetishes', item.id, { free: e.target.checked })}
                    />
                    Gratis
                  </label>
                  <label className="toggle-field">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => updateContentOption('fetishes', item.id, { enabled: e.target.checked })}
                    />
                    Aktiv
                  </label>
                  <button className="safe" onClick={() => removeContentOption('fetishes', item.id)}>Slet</button>
                  <small className="catalog-id">ID: {item.id}</small>
                </article>
              ))}
            </div>
          </details>
        </section>
      )}

      {tab === 'indstillinger' && (
        <section className="sheet admin-settings">
          <p className="kicker">System</p>
          <h2>Indstillinger</h2>
          <div className="admin-settings-grid">
            <article>
              <span>Database</span>
              <strong>{firebaseReady() ? 'Firestore forbundet' : 'Lokal demo-tilstand'}</strong>
            </article>
            <article>
              <span>Administratorkonto</span>
              <strong>{currentAccount()?.email || 'Ikke logget ind'}</strong>
            </article>
          </div>
          <p className="hint">
            Firebase-, Cloudflare- og Venice-nøgler ændres fortsat i deres sikre miljøindstillinger og vises ikke i appen.
          </p>
          <div className="row">
            <button className="primary" onClick={onBack}>Åbn bruger-app</button>
            <button
              className="ghost"
              onClick={() => {
                logout()
                onBack()
              }}
            >
              Log ud
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
