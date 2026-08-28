import { useEffect, useState } from 'react'
import type { Account } from '../engine/auth'
import {
  currentAccount,
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
import { AI_MODELS, DEFAULT_SCENES, IMAGE_MODELS, observeScenes, publishScenes } from '../engine/scenes'
import {
  DEFAULT_USAGE_CONFIG,
  approvePurchase,
  currentUsagePeriod,
  observePurchaseRequests,
  observeUsageConfig,
  observeUsageDashboard,
  publishUsageConfig,
  rejectPurchase,
  setUserEntitlementPlan,
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const existing = currentAccount()

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
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
        >
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            Adgangskode
            <input
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
          {existing && <p className="hint">Sidst: {existing.email}</p>}
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
  const [tab, setTab] = useState<'kunder' | 'tal' | 'forbrug' | 'prompts' | 'indhold'>('kunder')
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
  const list = loadAccounts()
  const active = list.filter((a) => a.status === 'active')
  const gone = list.filter((a) => a.status === 'cancelled' || a.status === 'churned')
  const mrr = active.reduce((sum, a) => sum + (PLANS.find((p) => p.id === a.plan)?.dkkMonth ?? 0), 0)

  useEffect(() => observeScenes(setScenes), [])
  useEffect(() => observeUsageConfig(setUsageConfig), [])
  useEffect(() => observeUsageDashboard(setUsageRows), [])
  useEffect(() => observePurchaseRequests(setPurchaseRequests), [])

  function refresh() {
    setTick((n) => n + 1)
  }

  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId)
  const currentUsageRows = usageRows.filter((row) => row.period === currentUsagePeriod())
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

  return (
    <main className="shell-wide">
      <p className="kicker">Stay admin · PC</p>
      <h1>Kontrolpanel</h1>
      <p className="hint">Egen side. Bruger-appen er et andet spor — telefon eller browser.</p>
      <div className="row admin-nav">
        <button className={tab === 'kunder' ? 'chip on' : 'chip'} onClick={() => setTab('kunder')}>
          Kunder
        </button>
        <button className={tab === 'tal' ? 'chip on' : 'chip'} onClick={() => setTab('tal')}>
          Tal
        </button>
        <button className={tab === 'forbrug' ? 'chip on' : 'chip'} onClick={() => setTab('forbrug')}>
          AI-forbrug
        </button>
        <button className={tab === 'prompts' ? 'chip on' : 'chip'} onClick={() => setTab('prompts')}>
          Prompts
        </button>
        <button className={tab === 'indhold' ? 'chip on' : 'chip'} onClick={() => setTab('indhold')}>
          Indhold
        </button>
        <button className="ghost" onClick={onBack}>
          Åbn bruger-app
        </button>
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

      <div className="stats">
        <div className="stat">
          <b>{active.length}</b>
          aktive
        </div>
        <div className="stat">
          <b>{gone.length}</b>
          afgang
        </div>
        <div className="stat">
          <b>{mrr} kr</b>
          MRR mock
        </div>
        <div className="stat">
          <b>{list.length}</b>
          konti
        </div>
      </div>

      {tab === 'kunder' && (
        <div className="table-wrap">
          <table className="admin">
            <thead>
              <tr>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Billeder</th>
                <th>Sidst set</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.email}
                    <div className="hint">{a.role}</div>
                  </td>
                  <td>
                    {(['free', 'solo', 'plus'] as PlanId[]).map((p) => (
                      <button
                        key={p}
                        className={a.plan === p ? 'chip on' : 'chip'}
                        onClick={() => {
                          const plan = PLANS.find((x) => x.id === p)!
                          setAccountPlan(a.id, p, plan.images)
                          void setUserEntitlementPlan(a.id, p).catch(() => undefined)
                          refresh()
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </td>
                  <td>{a.status}</td>
                  <td>{a.imagesLeft}</td>
                  <td>{new Date(a.lastSeen).toLocaleString('da-DK')}</td>
                  <td>
                    <button className="ghost" onClick={() => { setAccountStatus(a.id, 'paused'); refresh() }}>
                      Pause
                    </button>
                    <button className="ghost" onClick={() => { setAccountStatus(a.id, 'cancelled'); refresh() }}>
                      Opsig
                    </button>
                    <button className="safe" onClick={() => { setAccountStatus(a.id, 'churned'); refresh() }}>
                      Churn
                    </button>
                    <button className="chip on" onClick={() => { setAccountStatus(a.id, 'active'); refresh() }}>
                      Aktiv
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tal' && (
        <section className="sheet">
          <h2>Afgang</h2>
          <p className="lede">
            Opsagt er et aktivt stop. Churn er udebleven fornyelse. Senere fyldes det fra betalings-webhook.
          </p>
          <p className="hint">
            Mock MRR tæller kun aktive planer til listepris. Gebyr og Venice-kost er ikke trukket fra.
          </p>
        </section>
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
                Startbesked til brugeren
                <textarea
                  rows={3}
                  value={selectedScene.openingPrompt}
                  onChange={(e) => updateSelected({ openingPrompt: e.target.value })}
                />
              </label>
              <label className="field">
                Scenens systemprompt
                <textarea
                  rows={8}
                  value={selectedScene.systemPrompt}
                  onChange={(e) => updateSelected({ systemPrompt: e.target.value })}
                />
              </label>
              <label className="field">
                Prompt til “Giv mig en opgave”
                <textarea
                  rows={6}
                  value={selectedScene.taskPrompt}
                  onChange={(e) => updateSelected({ taskPrompt: e.target.value })}
                />
                <span>Bruges sammen med den aktuelle chat, brugerens intensitet, grænser og oplyste udstyr.</span>
              </label>
              <label className="field">
                Grundprompt til billeder
                <textarea
                  rows={5}
                  value={selectedScene.imagePrompt}
                  onChange={(e) => updateSelected({ imagePrompt: e.target.value })}
                />
              </label>
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
        <section className="sheet">
          <h2>Indhold</h2>
          <p className="lede">
            Her kommer senere: blokerede prompts, billedfejl fra Venice, NSFW-andel, support.
          </p>
          <p className="hint">Samme regler som i appen. Admin overskriver ikke 18+.</p>
        </section>
      )}
    </main>
  )
}
