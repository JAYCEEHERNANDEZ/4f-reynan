import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Plus, Search, X, Edit2, Trash2, Phone } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  // Realtime: refresh when customers change
  useRealtime(['customers'], loadCustomers)

  function openNew() {
    setEditing(null)
    setForm({ name: '', phone: '', email: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(cust) {
    setEditing(cust)
    setForm({ name: cust.name, phone: cust.phone, email: cust.email || '', notes: cust.notes || '' })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required')

    let error
    if (editing) {
      ({ error } = await supabase.from('customers').update(form).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('customers').insert(form))
    }
    if (error) return toast.error(error.message)
    toast.success(editing ? 'Customer updated!' : 'Customer added!')
    setShowModal(false)
    loadCustomers()
  }

  async function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Customer deleted')
    loadCustomers()
  }

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q)
  })

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div className="search-box">
          <Search />
          <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="empty-state"><p>No customers found</p></td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {c.phone}</span></td>
                  <td>{c.email || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => openEdit(c)}><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => deleteCustomer(c.id)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input className="form-control" placeholder="Juan Dela Cruz" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input className="form-control" placeholder="09171234567" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email" placeholder="email@example.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-control" placeholder="Notes about this customer..." value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
