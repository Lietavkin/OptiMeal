import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/DashboardLayout'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'
import {
  getConnectedProviders,
  getProviderProductCounts,
  getProviderSyncHistory,
  getProviderSyncStates,
  syncAllProviders,
  syncSingleProvider,
} from '../services/storeProviderSyncService'
import type { ProviderSyncHistoryItem, ProviderSyncState, StoreKey } from '../types'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleString()
}

function SyncStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : status === 'running'
          ? 'border-sky-200 bg-sky-50 text-sky-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${tone}`}>{status}</span>
}

export default function StoreDataManagementPage() {
  const { user } = useAuth()
  const [states, setStates] = useState<ProviderSyncState[]>([])
  const [history, setHistory] = useState<ProviderSyncHistoryItem[]>([])
  const [counts, setCounts] = useState<Record<StoreKey, number>>({
    lidl: 0,
    kaufland: 0,
    tesco: 0,
    billa: 0,
    carrefour: 0,
    aldi: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeProvider, setActiveProvider] = useState<StoreKey | 'all' | null>(null)

  const providers = useMemo(() => getConnectedProviders(), [])

  async function refresh() {
    setLoading(true)
    setError('')

    try {
      const [syncStates, syncHistory, productCounts] = await Promise.all([
        getProviderSyncStates(),
        getProviderSyncHistory(50),
        getProviderProductCounts(),
      ])

      setStates(syncStates)
      setHistory(syncHistory)
      setCounts(productCounts)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load store data sync dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const stateByProvider = useMemo(() => {
    const map = new Map<StoreKey, ProviderSyncState>()
    states.forEach((state) => map.set(state.providerKey, state))
    return map
  }, [states])

  const totalProducts = providers.reduce((sum, provider) => sum + (counts[provider.key] ?? 0), 0)
  const recentErrors = history.filter((item) => item.status === 'error').length

  async function handleSyncAll() {
    if (!user) return
    setActiveProvider('all')
    setError('')

    try {
      await syncAllProviders(user.id)
      await refresh()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Failed to sync providers.')
    } finally {
      setActiveProvider(null)
    }
  }

  async function handleSyncProvider(providerKey: StoreKey) {
    if (!user) return

    setActiveProvider(providerKey)
    setError('')

    try {
      await syncSingleProvider({ providerKey, userId: user.id })
      await refresh()
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Provider sync failed.')
    } finally {
      setActiveProvider(null)
    }
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-5 py-6 text-white shadow-xl shadow-slate-900/20 sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">External Data</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Store Data Management</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            Manage retailer provider syncs, inspect sync health, and maintain normalized grocery data for optimization.
          </p>
          <div className="mt-4">
            <Button onClick={handleSyncAll} disabled={!user || activeProvider === 'all'}>
              {activeProvider === 'all' ? 'Syncing all providers...' : 'Manual Sync All Providers'}
            </Button>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Connected providers</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{providers.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Normalized products</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalProducts}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent errors</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{recentErrors}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last sync event</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(history[0]?.startedAt ?? null)}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Connected providers</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading provider sync status...</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {providers.map((provider) => {
                const state = stateByProvider.get(provider.key)
                return (
                  <article key={provider.key} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{provider.displayName}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{provider.key}</p>
                      </div>
                      <SyncStatusBadge status={state?.status ?? 'idle'} />
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
                      <p>Products: {counts[provider.key] ?? 0}</p>
                      <p>Last sync: {formatDate(state?.lastSyncedAt ?? null)}</p>
                      <p>
                        Stats: +{state?.productsInserted ?? 0} / ~{state?.productsUpdated ?? 0} / ={state?.productsUnchanged ?? 0}
                      </p>
                      <p>Error: {state?.errorMessage ?? 'None'}</p>
                    </div>

                    <div className="mt-4">
                      <Button
                        onClick={() => handleSyncProvider(provider.key)}
                        disabled={!user || activeProvider === provider.key || activeProvider === 'all'}
                      >
                        {activeProvider === provider.key ? 'Syncing...' : `Manual Sync ${provider.displayName}`}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">Sync history</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading sync history...</p>
          ) : history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No sync history yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Finished</th>
                    <th className="px-3 py-2">Inserted</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2">Unchanged</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 uppercase tracking-[0.12em] text-slate-700">{item.providerKey}</td>
                      <td className="px-3 py-2"><SyncStatusBadge status={item.status} /></td>
                      <td className="px-3 py-2">{formatDate(item.startedAt)}</td>
                      <td className="px-3 py-2">{formatDate(item.finishedAt)}</td>
                      <td className="px-3 py-2">{item.productsInserted}</td>
                      <td className="px-3 py-2">{item.productsUpdated}</td>
                      <td className="px-3 py-2">{item.productsUnchanged}</td>
                      <td className="px-3 py-2 text-rose-700">{item.errorMessage ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </motion.div>
    </DashboardLayout>
  )
}
