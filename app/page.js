'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Receipt,
  User,
  ShoppingBag,
  Bike,
  TicketPercent,
  MoreHorizontal,
  Share2,
  RefreshCw,
  CheckCircle2,
  Circle,
  QrCode,
  Download,
  Upload,
  X
} from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import html2canvas from 'html2canvas'

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const formatMoney = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2
  }).format(amount)
}

// --- Constants & Themes ---
const PLATFORMS = {
  SEARCH: {
    id: 'generic',
    name: 'ทั่วไป',
    colors: {
      bg: 'from-slate-100 to-slate-200',
      card: 'bg-white/90',
      primary: 'bg-slate-800',
      text: 'text-slate-900',
      accent: 'text-slate-600',
      border: 'border-slate-200'
    }
  },
  SHOPEE: {
    id: 'shopee',
    name: 'ShopeeFood',
    colors: {
      bg: 'from-orange-50 to-red-50',
      card: 'bg-white/90',
      primary: 'bg-orange-500',
      text: 'text-orange-900',
      accent: 'text-orange-600',
      border: 'border-orange-200'
    }
  },
  GRAB: {
    id: 'grab',
    name: 'GrabFood',
    colors: {
      bg: 'from-green-50 to-emerald-50',
      card: 'bg-white/90',
      primary: 'bg-green-600',
      text: 'text-green-900',
      accent: 'text-green-700',
      border: 'border-green-200'
    }
  },
  LINEMAN: {
    id: 'lineman',
    name: 'LINE MAN',
    colors: {
      bg: 'from-lime-50 to-green-50',
      card: 'bg-white/90',
      primary: 'bg-[#06C755]', // LINE Green
      text: 'text-green-900',
      accent: 'text-green-700',
      border: 'border-green-200'
    }
  }
}

// --- Main Component ---
export default function Home() {
  // State
  const [platform, setPlatform] = useState('generic')
  const [billConfig, setBillConfig] = useState({
    delivery: 0,
    service: 0,
    discount: 0
  })

  // People: { id, name, items: [{id, name, price}], paid: boolean }

  const [people, setPeople] = useState([])
  const [qrCode, setQrCode] = useState(null)

  // UI State
  const [newPersonName, setNewPersonName] = useState('')
  const [activePersonId, setActivePersonId] = useState(null)

  // --- Refs ---
  const receiptRef = useRef(null)

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('boat-bill-splitter-v2')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setPlatform(data.platform || 'generic')
        setBillConfig(data.billConfig || { delivery: 0, service: 0, discount: 0 })
        setPeople(data.people || [])
        setQrCode(data.qrCode || null)
      } catch (e) {
        console.error('Failed to load saved data')
      }
    }

    // SW Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('boat-bill-splitter-v2', JSON.stringify({
      platform,
      billConfig,
      people,
      qrCode
    }))
  }, [platform, billConfig, people, qrCode])

  // --- Calculations ---
  const calculation = useMemo(() => {
    const totalFood = people.reduce((sum, p) =>
      sum + p.items.reduce((is, i) => is + i.price, 0), 0
    )

    const totalPeople = people.length
    if (totalPeople === 0) return { peopleResults: [], totals: {} }

    // Discount Logic:
    // 1. Food Discount = min(TotalDiscount, TotalFood) - distributed simply by food ratio
    // 2. Surplus Discount = TotalDiscount - Food Discount - distributed equally to reduce fees? 
    //    Actually, simple method: 
    //    Discount Ratio = TotalDiscount / TotalFood (if TotalDiscount < TotalFood)
    //    If TotalDiscount > TotalFood, food is free, remaining discount reduces fees.

    let effectiveFoodDiscount = 0
    let effectiveFeeDiscount = 0

    if (billConfig.discount <= totalFood) {
      effectiveFoodDiscount = billConfig.discount
    } else {
      effectiveFoodDiscount = totalFood
      effectiveFeeDiscount = billConfig.discount - totalFood
    }

    const totalFees = billConfig.delivery + billConfig.service
    const feePerPerson = Math.max(0, (totalFees - effectiveFeeDiscount) / totalPeople)

    const peopleResults = people.map(p => {
      const personFood = p.items.reduce((s, i) => s + i.price, 0)

      // Calculate discount share
      // If totalFood is 0, no discount share (avoid NaN)
      let discountShare = 0
      if (totalFood > 0) {
        discountShare = (personFood / totalFood) * effectiveFoodDiscount
      }

      const net = Math.max(0, personFood - discountShare + feePerPerson)

      return {
        ...p,
        stats: {
          food: personFood,
          discount: discountShare,
          fee: feePerPerson,
          net: net
        }
      }
    })

    const grandTotal = peopleResults.reduce((s, p) => s + p.stats.net, 0)

    return {
      totalFood,
      effectiveFoodDiscount,
      effectiveFeeDiscount,
      feePerPerson,
      peopleResults,
      grandTotal
    }
  }, [people, billConfig])

  // --- Handlers ---
  const addPerson = () => {
    if (!newPersonName.trim()) return
    const id = Date.now().toString()
    setPeople([...people, { id, name: newPersonName, items: [], paid: false }])
    setNewPersonName('')
    setActivePersonId(id)
  }

  const removePerson = (id) => {
    setPeople(people.filter(p => p.id !== id))
    if (activePersonId === id) setActivePersonId(null)
  }

  const addItemToPerson = (personId, name, price) => {
    if (!name || price < 0) return
    setPeople(people.map(p => {
      if (p.id !== personId) return p
      return {
        ...p,
        items: [...p.items, { id: Math.random().toString(), name, price: Number(price) }]
      }
    }))
  }

  const removeItem = (personId, itemId) => {
    setPeople(people.map(p => {
      if (p.id !== personId) return p
      return {
        ...p,
        items: p.items.filter(i => i.id !== itemId)
      }
    }))
  }

  const togglePaid = (id) => {
    setPeople(people.map(p => p.id === id ? { ...p, paid: !p.paid } : p))
  }

  const resetAll = () => {
    if (confirm('ล้างข้อมูลทั้งหมด?')) {
      setPeople([])
      setBillConfig({ delivery: 0, service: 0, discount: 0 })
      localStorage.removeItem('boat-bill-splitter-v2')
    }
  }


  const handleQrUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        alert('ไฟล์ใหญ่เกินไป กรุณาใช้ไฟล์ขนาดไม่เกิน 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setQrCode(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const downloadReceipt = async () => {
    if (!receiptRef.current) return
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `receipt-${new Date().toISOString().split('T')[0]}.png`
      link.href = url
      link.click()
    } catch (err) {
      console.error('Download failed', err)
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด')
    }
  }

  const theme = Object.values(PLATFORMS).find(p => p.id === platform)?.colors || PLATFORMS.SEARCH.colors

  return (
    <main className={cn("min-h-screen transition-colors duration-500 bg-gradient-to-br p-4 pb-20 md:p-8 font-sans", theme.bg)}>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-2xl shadow-lg text-white transition-colors", theme.primary)}>
              <Bike size={28} />
            </div>
            <div>
              <h1 className={cn("text-2xl font-bold transition-colors", theme.text)}>Bill Splitter</h1>
              <p className="text-sm text-gray-500">หารค่าข้าวแบบแฟร์ๆ สไตล์คนคูลๆ</p>
            </div>
          </div>

          <div className="flex bg-white/50 backdrop-blur p-1 rounded-xl border shadow-sm">
            {Object.values(PLATFORMS).map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  platform === p.id ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. Global Settings */}
            <section className={cn("rounded-3xl shadow-sm border p-6 transition-colors backdrop-blur-xl", theme.card, theme.border)}>
              <h2 className={cn("flex items-center gap-2 font-bold mb-4", theme.text)}>
                <TicketPercent size={20} /> ตั้งค่าบิล
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">ค่าส่ง</label>
                  <div className="relative">
                    <Bike className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="number"
                      value={billConfig.delivery || ''}
                      onChange={e => setBillConfig({ ...billConfig, delivery: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 transition-all text-sm font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">ค่าบริการ/อื่นๆ</label>
                  <div className="relative">
                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="number"
                      value={billConfig.service || ''}
                      onChange={e => setBillConfig({ ...billConfig, service: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:border-gray-200 focus:ring-0 transition-all text-sm font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-red-500">ส่วนลดรวม</label>
                  <div className="relative">
                    <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={16} />
                    <input
                      type="number"
                      value={billConfig.discount || ''}
                      onChange={e => setBillConfig({ ...billConfig, discount: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2 bg-red-50 text-red-600 rounded-xl border-transparent focus:bg-white focus:border-red-200 focus:ring-0 transition-all text-sm font-semibold placeholder:text-red-300"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* QR Code Settings */}
            <section className={cn("rounded-3xl shadow-sm border p-6 transition-colors backdrop-blur-xl", theme.card, theme.border)}>
              <h2 className={cn("flex items-center gap-2 font-bold mb-4", theme.text)}>
                <QrCode size={20} /> QR Code (รับเงิน)
              </h2>

              {!qrCode ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">อัพโหลด QR Code หรือ PromptPay</p>
                  <p className="text-xs text-gray-400 mt-1">ไฟล์จะถูกบันทึกไว้ในเครื่อง</p>
                </div>
              ) : (
                <div className="relative inline-block group">
                  <img src={qrCode} alt="QR Code" className="w-32 h-32 object-contain rounded-xl border bg-white" />
                  <button
                    onClick={() => setQrCode(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </section>

            {/* 2. People Manager */}
            <section className="space-y-4">
              {/* Add Person Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPerson()}
                  className="flex-1 px-4 py-3 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="พิมพ์ชื่อเพื่อน..."
                />
                <button
                  onClick={addPerson}
                  disabled={!newPersonName}
                  className={cn("px-6 py-3 rounded-2xl text-white font-medium shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50", theme.primary)}
                >
                  <Plus />
                </button>
              </div>

              {/* People List */}
              <AnimatePresence>
                <div className="grid grid-cols-1 gap-3">
                  {people.map(person => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      theme={theme}
                      isActive={activePersonId === person.id}
                      onToggle={() => setActivePersonId(activePersonId === person.id ? null : person.id)}
                      onAddItem={addItemToPerson}
                      onRemoveItem={removeItem}
                      onRemovePerson={removePerson}
                    />
                  ))}

                  {people.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center py-12 text-gray-400"
                    >
                      <User size={48} className="mx-auto mb-2 opacity-20" />
                      <p>ยังไม่มีใครเลย เพิ่มเพื่อนเพื่อเริ่มหารเงิน</p>
                    </motion.div>
                  )}
                </div>
              </AnimatePresence>
            </section>

            {people.length > 0 && (
              <button onClick={resetAll} className="w-full py-3 text-gray-400 hover:text-red-500 text-sm flex justify-center items-center gap-2 transition-colors">
                <RefreshCw size={14} /> ล้างข้อมูลทั้งหมด
              </button>
            )}
          </div>

          {/* RIGHT COLUMN: Receipt */}
          <div className="lg:col-span-5">
            <div className="sticky top-8">
              <div ref={receiptRef} className={cn("bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl border relative overflow-hidden", theme.border)}>
                {/* Decorative Header */}
                <div className={cn("absolute top-0 left-0 w-full h-2", theme.primary)} />

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">ใบเสร็จ</h2>
                    <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className={cn("p-2 rounded-xl bg-gray-50", theme.text)}>
                    <Receipt size={24} />
                  </div>
                </div>

                <div className="space-y-1 mb-6 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>ยอดรวมอาหาร</span>
                    <span>{formatMoney(calculation.totalFood)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าส่ง + บริการ</span>
                    <span>{formatMoney(billConfig.delivery + billConfig.service)}</span>
                  </div>
                  {(billConfig.discount > 0) && (
                    <div className="flex justify-between text-red-500 font-medium">
                      <span>ส่วนลด</span>
                      <span>-{formatMoney(billConfig.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-bold text-lg text-gray-900 mt-2">
                    <span>สุทธิ</span>
                    <span>{formatMoney(calculation.grandTotal)}</span>
                  </div>
                </div>

                {/* Per Person Breakdown */}
                <div className="space-y-3">
                  {calculation.peopleResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => togglePaid(p.id)}
                      className={cn(
                        "group relative p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                        p.paid ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100 hover:bg-white"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn("font-bold", p.paid ? "text-green-700" : "text-gray-800")}>{p.name}</span>
                        <span className={cn("text-lg font-bold", p.paid ? "text-green-600" : theme.text)}>
                          {formatMoney(p.stats.net)}
                        </span>
                      </div>

                      {/* Mini Details */}
                      <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                        {p.items.length > 0 ? (
                          <span>{p.items.map(i => i.name).join(', ')}</span>
                        ) : (
                          <span className="italic text-gray-400">ไม่มีรายการ</span>
                        )}
                      </div>

                      {/* Status Indicator */}
                      <div className="absolute top-3 right-[-8px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.paid ? <CheckCircle2 className="text-green-500 bg-white rounded-full" /> : <Circle className="text-gray-300" />}
                      </div>

                      {/* Detailed Breakdown (Only show if complex) */}
                      {(p.stats.fee > 0 || p.stats.discount > 0) && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200 text-[10px] text-gray-400 flex justify-between">
                          <span>อาหาร {formatMoney(p.stats.food)}</span>
                          <div className="flex gap-2">
                            {p.stats.fee > 0 && <span>+ค่าส่ง {Math.round(p.stats.fee)}</span>}
                            {p.stats.discount > 0 && <span className="text-red-400">-ส่วนลด {Math.round(p.stats.discount)}</span>}
                          </div>
                        </div>
                      )}

                      {p.paid && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl">
                          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg transform -rotate-12 border-2 border-white">
                            PAID
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <p className="text-xs text-gray-300 font-medium">calofgod - simple bill splitter</p>
                </div>

                {qrCode && (
                  <div className="mt-6 pt-6 border-t border-dashed border-gray-200 flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-500 font-medium">สแกนจ่ายได้เลย</p>
                    <img src={qrCode} alt="Payment QR" className="w-32 h-auto object-contain rounded-lg mix-blend-multiply" />
                  </div>
                )}

                {/* Bottom Rip Decoration */}
                <div className="absolute bottom-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_50%,white_50%)] bg-[length:16px_16px] rotate-180 translate-y-1" />
              </div>

              <div className="mt-4 text-center space-y-3">
                <p className="text-xs text-white/50">แคปหน้าจอส่วนนี้ส่งให้เพื่อนได้เลย!</p>
                <button
                  onClick={downloadReceipt}
                  className="inline-flex items-center gap-2 bg-white text-gray-800 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Download size={18} />
                  บันทึกรูปใบเสร็จ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function PersonCard({ person, theme, isActive, onToggle, onAddItem, onRemoveItem, onRemovePerson }) {
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive])

  const handleAdd = () => {
    if (itemName && itemPrice) {
      onAddItem(person.id, itemName, itemPrice)
      setItemName('')
      setItemPrice('')
      // Keep focus
      inputRef.current?.focus()
    }
  }

  const foodTotal = person.items.reduce((s, i) => s + i.price, 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn("bg-white rounded-2xl shadow-sm border overflow-hidden", isActive ? "ring-2 ring-offset-2 " + theme.border.replace('border', 'ring') : "border-transparent")}
    >
      {/* Card Header */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg", theme.primary)}>
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{person.name}</h3>
            <p className="text-xs text-gray-500">{person.items.length} รายการ - <span className="font-semibold text-gray-700">{formatMoney(foodTotal)}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRemovePerson(person.id); }}
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-gray-50/50"
          >
            <div className="p-4 pt-0 border-t border-gray-100">
              {/* Item List */}
              <div className="space-y-2 mt-4 mb-4">
                {person.items.map(item => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={item.id}
                    className="flex justify-between items-center group bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                  >
                    <span className="text-sm text-gray-700 ml-2">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{formatMoney(item.price)}</span>
                      <button
                        onClick={() => onRemoveItem(person.id, item.id)}
                        className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add Item Form */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="ชื่อเมนู"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('price-' + person.id)?.focus()}
                  className="flex-[2] px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <input
                  id={'price-' + person.id}
                  type="number"
                  placeholder="ราคา"
                  value={itemPrice}
                  onChange={e => setItemPrice(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  onClick={handleAdd}
                  className={cn("px-3 py-2 rounded-xl text-white shadow-sm hover:opacity-90 active:scale-95", theme.primary)}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
