import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

// Values must match the server's Joi / Mongoose enums exactly.
const STATUSES = ['lost', 'found', 'claimed']
const CATEGORIES = ['electronics', 'clothing', 'documents', 'accessories', 'other']

const defaults = { title: '', description: '', category: 'other', status: 'lost', location: '' }

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default function ItemForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')

  // Edit mode: when there is an `id`, load the item and fill the form.
  useEffect(() => {
    if (!id) {
      // /items/new: make sure we don't keep values from a previously edited item
      setForm(defaults)
      return
    }

    let cancelled = false // ignore the response if the component unmounts / id changes
    async function load() {
      setError('')
      try {
        const res = await api.get('/items/' + id)
        const item = res.data.item
        if (cancelled) return
        setForm({
          title: item.title || '',
          status: item.status || 'lost',
          category: item.category || 'other',
          // optional fields may be undefined -> use '' so inputs stay controlled
          location: item.location || '',
          description: item.description || ''
        })
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load item')
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // One handler for every input: the input's `name` is the key in `form`.
  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // POST a new item, or PATCH the existing one when editing,
  // then go back to /items. Show the server's error message on failure.
  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    // Never send reportedBy: the server takes it from the token and rejects it.
    const payload = {
      title: form.title,
      status: form.status,
      category: form.category,
      location: form.location,
      description: form.description
    }

    try {
      if (id) {
        await api.patch('/items/' + id, payload)
      } else {
        await api.post('/items', payload)
      }
      nav('/items')
    } catch (err) {
      // 400 (validation), 403 (not your item), 409 (duplicate) all carry { message }
      setError(err?.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'Report'} Item</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          name="title"
          placeholder="Title (e.g. Black backpack)"
          value={form.title}
          onChange={onChange}
        />

        <select className="input" name="status" value={form.status} onChange={onChange}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{capitalize(s)}</option>
          ))}
        </select>

        <select className="input" name="category" value={form.category} onChange={onChange}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{capitalize(c)}</option>
          ))}
        </select>

        <input
          className="input"
          name="location"
          placeholder="Location (optional, e.g. Library 2nd floor)"
          value={form.location}
          onChange={onChange}
        />

        <textarea
          className="input"
          name="description"
          rows={3}
          placeholder="Description (optional)"
          value={form.description}
          onChange={onChange}
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn" type="submit">Save</button>
      </form>
    </div>
  )
}