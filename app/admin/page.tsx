'use client'

import React, { useState, useRef, useEffect } from 'react'

const ADMIN_PIN = '0054'
const SESSION_KEY = 'fac-admin-access'

type Platform = 'amazon' | 'ebay' | 'etsy'
type ClaimType = 'not_received' | 'not_as_described' | 'item_damaged'

const PLATFORMS = {
  amazon: { label: 'Amazon', sub: 'A-to-Z Guarantee' },
  ebay: { label: 'eBay', sub: 'Money Back Guarantee' },
  etsy: { label: 'Etsy', sub: 'Purchase Protection' },
}

const CLAIM_TYPES = {
  not_received: 'Item Not Received',
  not_as_described: 'Item Not as Described',
  item_damaged: 'Item Arrived Damaged',
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    inputRefs[0].current?.focus()
  }, [])

  const tryUnlock = (vals: string[]) => {
    const pin = vals.join('')
    if (pin.length !== 4) return
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onUnlock()
    } else {
      setError(true)
      setTimeout(() => {
        setError(false)
        setDigits(['', '', '', ''])
        inputRefs[0].current?.focus()
      }, 600)
    }
  }

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    setError(false)
    if (digit && i < 3) {
      inputRefs[i + 1].current?.focus()
    }
    if (i === 3 && digit) {
      tryUnlock(next)
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits]
      next[i - 1] = ''
      setDigits(next)
      inputRefs[i - 1].current?.focus()
      e.preventDefault()
    } else if (e.key === 'Enter') {
      tryUnlock(digits)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0D1B2A] flex items-center justify-center z-50">
      <div className="text-center px-8">
        <div className="text-[#FF5A3D] font-bold text-4xl mb-2">Fight a Claim</div>
        <div className="text-[#53627A] text-xs tracking-widest uppercase mb-10">Admin Access</div>
        <div className="flex justify-center gap-3 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e => e.target.select()}
              className={`w-16 h-20 text-center text-3xl font-bold bg-transparent border-2 rounded-lg text-white outline-none transition-all
                ${error ? 'border-red-500 bg-red-500/10' : d ? 'border-[#FF5A3D]/60 bg-white/5' : 'border-white/20 focus:border-[#FF5A3D]'}`}
            />
          ))}
        </div>
        <div className={`text-xs text-red-400 tracking-widest uppercase transition-opacity ${error ? 'opacity-100' : 'opacity-0'}`}>
          Incorrect PIN
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [platform, setPlatform] = useState<Platform>('amazon')
  const [claimType, setClaimType] = useState<ClaimType>('not_received')
  const [orderId, setOrderId] = useState('')
  const [itemName, setItemName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [buyerMessage, setBuyerMessage] = useState('')
  const [asin, setAsin] = useState('')
  const [ebayItemNumber, setEbayItemNumber] = useState('')
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ letter: string; checklist: string[] } | null>(null)
  const [error, setError] = useState('')
  const [activeDoc, setActiveDoc] = useState<'letter' | 'checklist'>('letter')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setAuthed(true)
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: ADMIN_PIN,
          platform,
          claimType,
          orderId,
          itemName,
          trackingNumber,
          buyerMessage,
          asin,
          ebayItemNumber,
          shopName,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
        setActiveDoc('letter')
      }
    } catch {
      setError('Request failed. Check that ANTHROPIC_API_KEY is set in production.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(activeDoc === 'letter' ? result.letter : result.checklist.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!authed) return <PinGate onUnlock={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-[#0D1B2A]">
      <header className="bg-[#0D1B2A] border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-2 h-2 bg-[#FF5A3D] rounded-full" />
        <span className="text-white font-bold">Fight a Claim</span>
        <span className="text-[#53627A] text-xs tracking-widest uppercase">/ Admin</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <h1 className="text-white font-bold text-xl mb-6">Test Generate (no payment)</h1>

          <div className="space-y-5">
            <div>
              <label className="text-[#53627A] text-xs uppercase tracking-widest mb-2 block">Platform</label>
              <div className="flex gap-2">
                {(Object.entries(PLATFORMS) as [Platform, typeof PLATFORMS[Platform]][]).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setPlatform(key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all
                      ${platform === key ? 'border-[#FF5A3D] bg-[#FF5A3D]/10 text-[#FF5A3D]' : 'border-white/10 text-[#53627A] hover:border-white/20'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[#53627A] text-xs uppercase tracking-widest mb-2 block">Claim type</label>
              <div className="space-y-2">
                {(Object.entries(CLAIM_TYPES) as [ClaimType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setClaimType(key)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-all
                      ${claimType === key ? 'border-[#FF5A3D] bg-[#FF5A3D]/10 text-[#FF5A3D]' : 'border-white/10 text-[#53627A] hover:border-white/20'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'Order ID', value: orderId, set: setOrderId, placeholder: 'e.g. 112-3456789-0123456' },
              { label: 'Item name', value: itemName, set: setItemName, placeholder: 'e.g. Wireless Headphones' },
              ...(claimType !== 'not_as_described' ? [{ label: 'Tracking number', value: trackingNumber, set: setTrackingNumber, placeholder: 'e.g. 1Z999AA10123456784' }] : []),
              ...(platform === 'amazon' ? [{ label: 'ASIN', value: asin, set: setAsin, placeholder: 'e.g. B08N5WRWNW' }] : []),
              ...(platform === 'ebay' ? [{ label: 'eBay Item Number', value: ebayItemNumber, set: setEbayItemNumber, placeholder: '12-digit listing number' }] : []),
              ...(platform === 'etsy' ? [{ label: 'Shop name', value: shopName, set: setShopName, placeholder: 'e.g. VintageTreasuresShop' }] : []),
            ].map(f => (
              <div key={f.label}>
                <label className="text-[#53627A] text-xs uppercase tracking-widest mb-2 block">{f.label}</label>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#FF5A3D]/50"
                />
              </div>
            ))}

            <div>
              <label className="text-[#53627A] text-xs uppercase tracking-widest mb-2 block">Buyer message</label>
              <textarea
                rows={3}
                value={buyerMessage}
                onChange={e => setBuyerMessage(e.target.value)}
                placeholder="Paste buyer's claim message..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#FF5A3D]/50 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-[#FF5A3D] hover:bg-[#d94020] disabled:bg-[#FF5A3D]/40 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : 'Generate (free)'}
            </button>
          </div>
        </div>

        {/* Result */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-xl">Output</h2>
            {result && (
              <button
                onClick={handleCopy}
                className="text-[#53627A] hover:text-white text-xs uppercase tracking-widest transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>

          {result ? (
            <div>
              <div className="flex gap-2 mb-4">
                {(['letter', 'checklist'] as const).map(doc => (
                  <button
                    key={doc}
                    onClick={() => setActiveDoc(doc)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all
                      ${activeDoc === doc ? 'bg-[#FF5A3D] text-white' : 'bg-white/5 text-[#53627A] hover:text-white'}`}
                  >
                    {doc === 'letter' ? 'Dispute Letter' : 'Evidence Checklist'}
                  </button>
                ))}
              </div>

              {activeDoc === 'letter' ? (
                <pre className="bg-white/5 border border-white/10 rounded-lg p-5 text-sm text-white/80 font-mono leading-relaxed whitespace-pre-wrap overflow-auto max-h-[600px]">
                  {result.letter}
                </pre>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-3">
                  {result.checklist.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-white/80">
                      <span className="text-[#FF5A3D] font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg h-64 flex items-center justify-center text-[#53627A] text-sm">
              {loading ? 'Calling Anthropic API...' : 'Output will appear here'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
