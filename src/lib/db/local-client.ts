// localStorage mock that mirrors the Supabase client API
// swap back to Supabase: change src/lib/supabase/client.ts to use createBrowserClient

const P = 'tms_'

// ─── low-level helpers ────────────────────────────────────────────────────────

function load<T = any>(table: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(P + table) || '[]') } catch { return [] }
}
function save(table: string, data: any[]) {
  if (typeof window !== 'undefined') localStorage.setItem(P + table, JSON.stringify(data))
}
function uid() { return crypto.randomUUID() }
function now() { return new Date().toISOString() }
function seq(key: string, prefix: string, pad = 4) {
  const n = (parseInt(localStorage.getItem(P + 'seq_' + key) || '0') + 1)
  localStorage.setItem(P + 'seq_' + key, String(n))
  return `${prefix}${String(n).padStart(pad, '0')}`
}

// ─── join resolution ──────────────────────────────────────────────────────────

// parent_table → child_alias → { fk on parent (or child), type }
const FK: Record<string, Record<string, { fk: string; rev?: boolean; type: 'one' | 'many' }>> = {
  orders: {
    customers:            { fk: 'customer_id',        type: 'one'  },
    employees:            { fk: 'assigned_tailor_id',  type: 'one'  },
    order_items:          { fk: 'order_id',            rev: true, type: 'many' },
    order_status_history: { fk: 'order_id',            rev: true, type: 'many' },
  },
  order_items: {
    services: { fk: 'service_id', type: 'one' },
  },
  order_status_history: {
    user_profiles: { fk: 'user_id', type: 'one' },
  },
  invoices: {
    customers:    { fk: 'customer_id', type: 'one'  },
    orders:       { fk: 'order_id',    type: 'one'  },
    invoice_items:{ fk: 'invoice_id',  rev: true, type: 'many' },
  },
  invoice_items: {
    order_items: { fk: 'order_item_id', type: 'one' },
  },
  measurement_profiles: {
    customers:            { fk: 'customer_id', type: 'one'  },
    measurement_versions: { fk: 'profile_id',  rev: true, type: 'many' },
  },
  customers: {
    measurement_profiles: { fk: 'customer_id', rev: true, type: 'many' },
  },
  payments: {
    customers: { fk: 'customer_id', type: 'one' },
    orders:    { fk: 'order_id',    type: 'one' },
  },
  deliveries: {
    customers: { fk: 'customer_id',  type: 'one' },
    orders:    { fk: 'order_id',     type: 'one' },
    employees: { fk: 'delivered_by', type: 'one' },
  },
  services: {
    service_categories: { fk: 'category_id', type: 'one' },
  },
  inventory_items: {
    service_categories: { fk: 'category_id', type: 'one' },
  },
}

// Parse "*, customers(name, phone), order_items(*, services(name))"
function parseJoins(sel: string) {
  const out: { alias: string; cols: string }[] = []
  const re = /(\w+)\(([^()]*(?:\([^()]*\))*[^()]*)\)/g
  let m
  while ((m = re.exec(sel)) !== null) out.push({ alias: m[1], cols: m[2] })
  return out
}

function applyJoins(rec: any, fromTable: string, sel: string): any {
  if (!sel || sel.trim() === '*') return rec
  const joins = parseJoins(sel)
  if (!joins.length) return rec
  const result = { ...rec }
  for (const { alias, cols } of joins) {
    const def = FK[fromTable]?.[alias]
    if (!def) continue
    const rel = load<any>(alias)
    if (def.type === 'one') {
      const found = rel.find((r: any) => r.id === rec[def.fk]) ?? null
      if (found) {
        const c = cols.split(',').map(x => x.trim())
        result[alias] = c[0] === '*' ? applyJoins(found, alias, cols) : Object.fromEntries(c.map(k => [k, found[k]]))
      } else { result[alias] = null }
    } else {
      const fkKey = def.fk // key on child table pointing to rec.id
      const many = rel.filter((r: any) => r[fkKey] === rec.id)
      const c = cols.split(',').map((x: string) => x.trim())
      result[alias] = c[0] === '*'
        ? many.map((r: any) => applyJoins(r, alias, cols))
        : many.map((r: any) => Object.fromEntries(c.map((k: string) => [k, r[k]])))
    }
  }
  return result
}

// ─── query builder ────────────────────────────────────────────────────────────

type Filter = (r: any) => boolean

class QB {
  private _t: string
  private _op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _sel = '*'
  private _filters: Filter[] = []
  private _ord: { col: string; asc: boolean } | null = null
  private _lim: number | null = null
  private _single = false
  private _payload: any = null
  private _countOnly = false

  constructor(t: string) { this._t = t }

  select(s = '*', opts?: { count?: string; head?: boolean })  {
    this._op = 'select'; this._sel = s
    if (opts?.head) this._countOnly = true
    return this
  }
  insert(d: any)   { this._op = 'insert'; this._payload = d; return this }
  update(d: any)   { this._op = 'update'; this._payload = d; return this }
  upsert(d: any)   { this._op = 'upsert'; this._payload = d; return this }
  delete()         { this._op = 'delete'; return this }
  single()         { this._single = true; return this }
  limit(n: number) { this._lim = n; return this }
  maybeSingle()    { this._single = true; return this }

  eq(c: string, v: any)  { this._filters.push(r => r[c] === v); return this }
  neq(c: string, v: any) { this._filters.push(r => r[c] !== v); return this }
  gt(c: string, v: any)  { this._filters.push(r => r[c] > v);   return this }
  lt(c: string, v: any)  { this._filters.push(r => r[c] < v);   return this }
  gte(c: string, v: any) { this._filters.push(r => r[c] >= v);  return this }
  lte(c: string, v: any) { this._filters.push(r => r[c] <= v);  return this }
  is(c: string, v: any)  { this._filters.push(r => r[c] === v); return this }

  like(c: string, pat: string) {
    const rx = new RegExp(pat.replace(/%/g, '.*'), 'i')
    this._filters.push(r => rx.test(String(r[c] ?? '')))
    return this
  }
  ilike(c: string, pat: string) { return this.like(c, pat) }

  in(c: string, vals: any[]) {
    this._filters.push(r => vals.includes(r[c]))
    return this
  }
  not(c: string, op: string, v: any) {
    if (op === 'in') {
      const vals = String(v).replace(/[()]/g, '').split(',').map((x: string) => x.trim())
      this._filters.push(r => !vals.includes(String(r[c])))
    } else {
      this._filters.push(r => r[c] !== v)
    }
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._ord = { col, asc: opts?.ascending !== false }
    return this
  }

  then(res: (v: any) => any, rej?: (e: any) => any) {
    return this._exec().then(res, rej)
  }

  private _match(r: any) { return this._filters.every(f => f(r)) }

  private async _exec(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const rows = load<any>(this._t)

      switch (this._op) {
        case 'select': {
          let out = rows.filter(r => this._match(r))
          if (this._countOnly) return { data: null, error: null, count: out.length }
          out = out.map(r => applyJoins(r, this._t, this._sel))
          if (this._ord) {
            const { col, asc } = this._ord
            out.sort((a: any, b: any) => {
              const av = a[col], bv = b[col]
              if (av == null && bv == null) return 0
              if (av == null) return asc ? 1 : -1
              if (bv == null) return asc ? -1 : 1
              return asc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
            })
          }
          if (this._lim) out = out.slice(0, this._lim)
          if (this._single) return { data: out[0] ?? null, error: out.length === 0 ? { code: 'PGRST116', message: 'Not found' } : null }
          return { data: out, error: null }
        }

        case 'insert': {
          const arr = Array.isArray(this._payload) ? this._payload : [this._payload]
          const stamped = arr.map(d => ({ id: uid(), created_at: now(), updated_at: now(), ...d }))
          save(this._t, [...rows, ...stamped])
          if (this._single) return { data: stamped[0], error: null }
          return { data: stamped, error: null }
        }

        case 'upsert': {
          const arr = Array.isArray(this._payload) ? this._payload : [this._payload]
          const next = [...rows]
          const result: any[] = []
          for (const d of arr) {
            const idx = d.id ? next.findIndex(r => r.id === d.id) : -1
            if (idx >= 0) { next[idx] = { ...next[idx], ...d, updated_at: now() }; result.push(next[idx]) }
            else { const n = { id: uid(), created_at: now(), updated_at: now(), ...d }; next.push(n); result.push(n) }
          }
          save(this._t, next)
          return { data: this._single ? result[0] : result, error: null }
        }

        case 'update': {
          const updated: any[] = []
          const next = rows.map(r => {
            if (this._match(r)) { const u = { ...r, ...this._payload, updated_at: now() }; updated.push(u); return u }
            return r
          })
          save(this._t, next)
          if (this._single) return { data: updated[0] ?? null, error: null }
          return { data: updated, error: null }
        }

        case 'delete': {
          save(this._t, rows.filter(r => !this._match(r)))
          return { data: null, error: null }
        }
      }
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } }
    }
  }
}

// ─── auth ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = P + 'session'
const USERS_KEY   = P + 'users'

const _listeners: Array<(event: string, session: any) => void> = []

function currentSession() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

const auth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const users: any[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const u = users.find(x => x.email === email && x.password === password)
    if (!u) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
    const session = { access_token: uid(), user: { id: u.id, email: u.email, user_metadata: u.metadata || {} } }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    _listeners.forEach(cb => cb('SIGNED_IN', session))
    return { data: { user: session.user, session }, error: null }
  },

  signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
    const users: any[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    if (users.find((u: any) => u.email === email))
      return { data: { user: null, session: null }, error: { message: 'User already registered' } }
    const id = uid()
    users.push({ id, email, password, metadata: options?.data || {} })
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    const profiles = load<any>('user_profiles')
    profiles.push({ id, email, full_name: options?.data?.full_name || '', role: options?.data?.role || 'owner', shop_name: options?.data?.shop_name || '', created_at: now(), updated_at: now() })
    save('user_profiles', profiles)
    const session = { access_token: uid(), user: { id, email, user_metadata: options?.data || {} } }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    _listeners.forEach(cb => cb('SIGNED_IN', session))
    return { data: { user: session.user, session }, error: null }
  },

  signOut: async () => {
    localStorage.removeItem(SESSION_KEY)
    _listeners.forEach(cb => cb('SIGNED_OUT', null))
    return { error: null }
  },

  getSession: async () => ({ data: { session: currentSession() }, error: null }),
  getUser:    async () => ({ data: { user: currentSession()?.user ?? null }, error: null }),

  resetPasswordForEmail: async (_email: string, _opts?: any) => ({ error: null }),

  updateUser: async (attrs: any) => {
    const session = currentSession()
    if (!session?.user) return { data: { user: null }, error: { message: 'Not logged in' } }
    const users: any[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const idx = users.findIndex((u: any) => u.id === session.user.id)
    if (idx >= 0 && attrs.password) { users[idx].password = attrs.password; localStorage.setItem(USERS_KEY, JSON.stringify(users)) }
    return { data: { user: session.user }, error: null }
  },

  onAuthStateChange: (cb: (event: string, session: any) => void) => {
    _listeners.push(cb)
    const s = currentSession()
    setTimeout(() => cb(s ? 'SIGNED_IN' : 'SIGNED_OUT', s), 0)
    return { data: { subscription: { unsubscribe: () => { const i = _listeners.indexOf(cb); if (i >= 0) _listeners.splice(i, 1) } } } }
  },
}

// ─── RPC ──────────────────────────────────────────────────────────────────────

function rpc(fn: string, _params?: any) {
  const handlers: Record<string, () => any> = {
    generate_customer_code: () => seq('customer', 'CUST-'),
    generate_order_number:  () => seq('order',    'ORD-'),
    generate_invoice_number:() => seq('invoice',  'INV-'),
  }
  const handler = handlers[fn] as (() => any) | undefined
  const data = handler ? handler() : null
  const error: any = handler ? null : { message: `RPC ${fn} not implemented` }
  return Promise.resolve({ data, error })
}

// ─── export ───────────────────────────────────────────────────────────────────

export function createLocalClient() {
  return {
    from: (table: string) => new QB(table),
    rpc,
    auth,
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
      }),
    },
  }
}
