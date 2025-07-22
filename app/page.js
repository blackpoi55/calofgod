'use client'

import { useEffect, useState } from 'react' 

export default function Home() {
  const [totalBefore, setTotalBefore] = useState(0)
  const [totalAfter, setTotalAfter] = useState(0)
  const [people, setPeople] = useState([])
  const [selected, setSelected] = useState('')
  const [amountChange, setAmountChange] = useState(0)

  useEffect(() => {
    const target = document.getElementById('result-section')
    if (target) {
      const observer = new MutationObserver(observeScreenshot)
      observer.observe(target, { childList: true, subtree: true })
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }

    const saved = localStorage.getItem('discountData')
    if (saved) {
      const data = JSON.parse(saved)
      const fixedPeople = data.people.map(p => ({
        ...p,
        paid: !!p.paid // ถ้าไม่มี paid, ใส่ false ให้
      }))
      setTotalBefore(data.totalBefore)
      setTotalAfter(data.totalAfter)
      setPeople(fixedPeople)
    }

  }, [])

  useEffect(() => {
    localStorage.setItem(
      'discountData',
      JSON.stringify({ totalBefore, totalAfter, people })
    )
  }, [totalBefore, totalAfter, people])

  const totalDiscount = totalBefore - totalAfter

  const getShare = (amount) => {
    if (totalBefore === 0) return '0.00'
    const ratio = amount / totalBefore
    const discounted = ratio * totalAfter
    return discounted.toFixed(2)
  }

  const handleAddOrUpdate = () => {
    if (!selected || amountChange === 0) return
    setPeople((prev) => {
      const found = prev.find((p) => p.name === selected)
      if (found) {
        return prev.map((p) =>
          p.name === selected
            ? { ...p, amount: Math.max(p.amount + amountChange, 0) }
            : p
        )
      } else {
        return [...prev, { name: selected, amount: Math.max(amountChange, 0), paid: false }]
      }
    })
    setAmountChange(0)
  }

  const handleRemoveAllOfPerson = () => {
    if (!selected) return
    setPeople((prev) => prev.filter((p) => p.name !== selected))
  }

  const togglePaid = (name) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.name === name ? { ...p, paid: !p.paid } : p
      )
    )
  }

  const getPersonCount = (name) => people.filter((p) => p.name === name).length

  const resetAll = () => {
    if (confirm('แน่ใจว่าต้องการล้างข้อมูลทั้งหมด?')) {
      setTotalBefore(0)
      setTotalAfter(0)
      setPeople([])
      localStorage.removeItem('discountData')
    }
  }
 

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 p-4">
      <div className="w-full max-w-5xl mx-auto bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-4 sm:p-6 space-y-6 border border-purple-200">
        <h1 className="text-3xl font-bold text-center text-purple-700">💸 หารส่วนลดตามสัดส่วน</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ยอดก่อนลด</label>
            <input
              type="number"
              value={totalBefore || ''}
              onChange={(e) => setTotalBefore(e.target.value === '' ? 0 : Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-purple-300 px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ยอดหลังลด</label>
            <input
              type="number"
              value={totalAfter || ''}
              onChange={(e) => setTotalAfter(e.target.value === '' ? 0 : Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-green-300 px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold text-lg text-blue-700 mb-2">จัดการผู้สั่ง</h2>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <input
              list="people-list"
              type="text"
              placeholder="ชื่อ"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full sm:w-1/2 rounded-lg border px-3 py-2"
            />
            <datalist id="people-list">
              {[...new Set(people.map((p) => p.name))].map((name, i) => (
                <option key={i} value={name} />
              ))}
            </datalist>
            <input
              type="number"
              placeholder="+/- ยอด"
              value={amountChange || ''}
              onChange={(e) => setAmountChange(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-full sm:w-1/3 rounded-lg border px-3 py-2"
            />
            <button
              onClick={handleAddOrUpdate}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl"
            >ยืนยัน</button>
            <button
              onClick={handleRemoveAllOfPerson}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
            >ลบคน</button>
            <button
              onClick={resetAll}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-xl"
            >ล้างข้อมูล</button>
          </div>
        </div>

        {people.length > 0 && (
          <div id="result-section" className="border-t pt-4 rounded-2xl shadow-xl bg-gradient-to-tr from-white via-purple-50 to-purple-100 p-6">
            <h2 className="text-lg font-bold text-purple-800 mb-2">📊 ผลลัพธ์</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-2xl overflow-x-auto shadow-lg bg-white">
                <thead className="bg-gradient-to-r from-purple-200 to-purple-300 text-purple-900 font-semibold" style={{ fontSize: '1rem' }}>
                  <tr>
                    <th className="border px-2 py-1 text-center">ชื่อ</th>
                    <th className="border px-2 py-1 text-center">ยอดซื้อ</th>
                    <th className="border px-2 py-1 text-center">จ่ายจริง</th>
                    <th className="border px-2 py-1">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p, i) => (
                    <tr key={i} className="hover:bg-purple-50">
                      <td className="border px-2 py-1  text-center text-sm break-words">{p.name}</td>
                      <td className="border px-2 py-1  text-center">
                        <input type="number" className="w-full sm:w-24 px-2 py-1  rounded"
                          value={p.amount}
                          onChange={(e) => {
                            const newAmount = Number(e.target.value);
                            setPeople(prev => prev.map((item, idx) => idx === i ? { ...item, amount: newAmount } : item))
                          }}
                        />
                      </td>
                      <td className="border px-2 py-1  text-center text-green-600 font-semibold">฿{getShare(p.amount)}</td>
                      <td className="border px-2 py-1 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!p.paid}
                            onChange={() => togglePaid(p.name)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-checked:bg-green-400 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-500 transition duration-300"></div>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-purple-300 rounded-xl p-6 mt-6 text-base text-gray-800 space-y-2 shadow-lg backdrop-blur-md">
              <div>
                🎁 <b>ส่วนลดรวม:</b> <span className="text-pink-600">฿{totalDiscount.toFixed(2)}</span>
              </div>
              <div>
                🧾 <b>ยอดซื้อรวม:</b> <span className="text-purple-700">฿{people.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
              </div>
              <div>
                💵 <b>จ่ายจริงรวม:</b> <span className="text-green-700">฿{people.reduce((sum, p) => sum + Number(getShare(p.amount)), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
