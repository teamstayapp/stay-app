import { useState } from 'react'
import type { Account } from '../engine/auth'
import {
  currentAccount,
  loadAccounts,
  loginAsync,
  logout,
  registerAsync,
  setAccountPlan,
  setAccountStatus,
} from '../engine/auth'
import { PLANS, type PlanId } from '../engine/plans'

export function LoginScreen({
  onIn,
  onAdmin,
}: {
  onIn: (acc: Account) => void
  onAdmin: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const existing = currentAccount()

  async function go(kind: 'in' | 'up') {
    setBusy(true)
    setErr('')
    const res = kind === 'in' ? await loginAsync(email, password) : await registerAsync(email, password)
    setBusy(false)
    if (typeof res === 'string') {
      setErr(res)
      return
    }
    if (res.role === 'admin') onAdmin()
    else onIn(res)
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
          <h1>Velkommen tilbage</h1>
          <p className="lede">Log ind for at fortsætte til Stay.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            go('in')
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
              autoComplete="current-password"
              required
            />
          </label>
          {existing && <p className="hint">Sidst: {existing.email}</p>}
          {err && <p className="form-message">{err}</p>}
          <button className="primary login-btn" disabled={busy}>
            {busy ? 'Arbejder…' : 'Log ind →'}
          </button>
          <button type="button" className="ghost login-btn" disabled={busy} onClick={() => go('up')}>
            Opret konto
          </button>
          <button
            type="button"
            className="reset-link"
            disabled={busy}
            onClick={() =>
              setErr(email ? 'Glemt kode kommer når login ligger på server.' : 'Indtast din email først.')
            }
          >
            Glemt adgangskode?
          </button>
        </form>
        <p className="hint">Stay · udviklingsmiljø · admin@stay.local / admin</p>
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
  const [tab, setTab] = useState<'kunder' | 'tal' | 'indhold'>('kunder')
  const [, setTick] = useState(0)
  const list = loadAccounts()
  const active = list.filter((a) => a.status === 'active')
  const gone = list.filter((a) => a.status === 'cancelled' || a.status === 'churned')
  const mrr = active.reduce((sum, a) => sum + (PLANS.find((p) => p.id === a.plan)?.dkkMonth ?? 0), 0)

  function refresh() {
    setTick((n) => n + 1)
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
