import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'
import {
  DollarSign, TrendingUp, ShoppingBag, Percent,
  Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#ec4899']

export default function Analytics() {
  const [period, setPeriod] = useState('30')
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})

  useEffect(() => { loadAnalytics() }, [period])

  // Realtime: refresh analytics when orders or expenses change
  const loadAnalyticsCb = useCallback(() => loadAnalytics(), [period])
  useRealtime(['orders', 'expenses'], loadAnalyticsCb)

  async function loadAnalytics() {
    setLoading(true)
    const startDate = period === '0'
      ? startOfDay(new Date()).toISOString()
      : subDays(new Date(), parseInt(period)).toISOString()

    const [ordersRes, expensesRes, allOrdersRes] = await Promise.all([
      supabase.from('orders').select('*, service_types(name)')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),
      supabase.from('expenses').select('*')
        .gte('expense_date', period === '0'
          ? format(new Date(), 'yyyy-MM-dd')
          : format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd')),
      supabase.from('orders').select('total_price, payment_status, created_at')
    ])

    const orderData = ordersRes.data || []
    const expenseData = expensesRes.data || []
    setOrders(orderData)
    setExpenses(expenseData)

    // Calculate stats
    const totalRevenue = orderData
      .filter(o => o.payment_status === 'paid')
      .reduce((s, o) => s + Number(o.total_price), 0)
    const totalExpenses = expenseData.reduce((s, e) => s + Number(e.amount), 0)
    const profit = totalRevenue - totalExpenses
    const avgOrderValue = orderData.length > 0 ? totalRevenue / orderData.length : 0

    // Previous period comparison
    const prevStart = period === '0'
      ? subDays(startOfDay(new Date()), 1).toISOString()
      : subDays(new Date(), parseInt(period) * 2).toISOString()
    const prevOrders = (allOrdersRes.data || []).filter(o =>
      o.created_at >= prevStart && o.created_at < startDate && o.payment_status === 'paid'
    )
    const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total_price), 0)
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0

    setStats({
      totalRevenue, totalExpenses, profit, avgOrderValue,
      totalOrders: orderData.length,
      revenueChange: revenueChange.toFixed(1)
    })
    setLoading(false)
  }

  // Revenue over time chart data
  function getRevenueChartData() {
    const days = period === '0' ? 0 : parseInt(period)
    const interval = eachDayOfInterval({
      start: days === 0 ? new Date() : subDays(new Date(), days),
      end: new Date()
    })

    return interval.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayOrders = orders.filter(o =>
        format(new Date(o.created_at), 'yyyy-MM-dd') === dayStr && o.payment_status === 'paid'
      )
      const dayExpenses = expenses.filter(e => e.expense_date === dayStr)
      return {
        date: format(day, 'MMM d'),
        revenue: dayOrders.reduce((s, o) => s + Number(o.total_price), 0),
        expenses: dayExpenses.reduce((s, e) => s + Number(e.amount), 0),
        orders: dayOrders.length
      }
    })
  }

  // Service breakdown
  function getServiceBreakdown() {
    const map = {}
    orders.forEach(o => {
      const name = o.service_types?.name || 'Unknown'
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 }
      map[name].count++
      map[name].revenue += Number(o.total_price)
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }

  // Payment method breakdown
  function getPaymentBreakdown() {
    const map = {}
    orders.forEach(o => {
      const method = o.payment_method || 'cash'
      if (!map[method]) map[method] = { name: method, value: 0 }
      map[method].value++
    })
    return Object.values(map)
  }

  // Status breakdown
  function getStatusBreakdown() {
    const map = {}
    orders.forEach(o => {
      if (!map[o.status]) map[o.status] = { name: o.status.replace('_', ' '), value: 0 }
      map[o.status].value++
    })
    return Object.values(map)
  }

  const revenueData = getRevenueChartData()
  const serviceData = getServiceBreakdown()
  const paymentData = getPaymentBreakdown()

  return (
    <>
      {/* Period selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="tabs" style={{ display: 'inline-flex', margin: 0 }}>
          {[
            { value: '0', label: 'Today' },
            { value: '7', label: '7 Days' },
            { value: '30', label: '30 Days' },
            { value: '90', label: '90 Days' },
            { value: '365', label: '1 Year' }
          ].map(p => (
            <button key={p.value} className={`tab ${period === p.value ? 'active' : ''}`} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto', transition: 'opacity 0.2s' }}>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon"><DollarSign size={22} /></div>
          <div className="stat-value">₱{stats.totalRevenue?.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
          <div className={`stat-change ${Number(stats.revenueChange) >= 0 ? 'up' : 'down'}`}>
            {Number(stats.revenueChange) >= 0
              ? <><ArrowUpRight size={14} /> +{stats.revenueChange}%</>
              : <><ArrowDownRight size={14} /> {stats.revenueChange}%</>
            } vs previous period
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><TrendingUp size={22} /></div>
          <div className="stat-value">₱{stats.totalExpenses?.toLocaleString()}</div>
          <div className="stat-label">Total Expenses</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon"><Percent size={22} /></div>
          <div className="stat-value" style={{ color: stats.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ₱{stats.profit?.toLocaleString()}
          </div>
          <div className="stat-label">Net Profit</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><ShoppingBag size={22} /></div>
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
            Avg: ₱{stats.avgOrderValue?.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3>Revenue & Expenses</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#111827', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 13 }}
                formatter={(v) => [`₱${v.toLocaleString()}`]} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Orders per Day</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#111827', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 13 }} />
              <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3>Revenue by Service</h3>
          </div>
          {serviceData.length > 0 ? (
            <div>
              {serviceData.map((s, i) => {
                const maxRev = Math.max(...serviceData.map(x => x.revenue))
                const pct = maxRev > 0 ? (s.revenue / maxRev * 100) : 0
                return (
                  <div key={s.name} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>₱{s.revenue.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({s.count} orders)</span></span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state"><p>No data available</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Payment Methods</h3>
          </div>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name} (${value})`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#111827', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data available</p></div>
          )}
        </div>
      </div>

      </div>
    </>
  )
}
