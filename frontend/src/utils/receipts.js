const logoUrl = '/kfa-logo.png'

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`
}

function receiptNumber(prefix, id) {
  return `${prefix}-${String(id || Date.now()).padStart(5, '0')}`
}

export function feeReceiptData({ fee, student, payment }) {
  const paidAmount = payment?.amount ?? fee?.paid_amount ?? fee?.total_amount ?? 0
  return {
    id: payment?.id || fee?.id,
    receiptNo: receiptNumber(payment ? 'KFA-PAY' : 'KFA-FEE', payment?.id || fee?.id),
    date: payment?.payment_date || new Date().toISOString().slice(0, 10),
    studentName: fee?.student_name || student?.name || 'Student',
    phone: student?.phone || '',
    branch: fee?.branch_name || student?.branch_name || 'KFA Branch',
    item: fee?.course_name || fee?.program_name || fee?.grade_name || fee?.university_program_name || fee?.fee_type || 'Academy Fee',
    feeType: fee?.fee_type || 'fee',
    totalAmount: fee?.total_amount || fee?.amount || paidAmount,
    paidAmount,
    dueAmount: fee?.due_amount || 0,
    status: fee?.status || 'paid',
  }
}

export function receiptHtml(receipt) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${receipt.receiptNo}</title>
  <style>
    body { margin: 0; background: #f4f1eb; color: #171141; font-family: Arial, sans-serif; }
    .receipt { width: min(760px, calc(100% - 32px)); margin: 24px auto; background: #fff; border: 1px solid #ddd7ec; border-radius: 10px; overflow: hidden; box-shadow: 0 20px 60px rgba(23,17,65,.14); }
    .head { display: flex; align-items: center; gap: 16px; padding: 22px 26px; background: linear-gradient(135deg, #171141, #2f2482); color: #fff; }
    .head img { width: 72px; height: 72px; object-fit: contain; background: #fff; border-radius: 50%; padding: 6px; }
    .head h1 { margin: 0; font-size: 26px; }
    .head p { margin: 4px 0 0; color: #ffced2; font-weight: 700; }
    .body { padding: 26px; }
    .meta, .rows { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .box { border: 1px solid #e6e0f4; border-radius: 8px; padding: 13px; background: #fbfaf7; }
    .box span { display: block; color: #6b6174; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .box strong { display: block; margin-top: 5px; font-size: 16px; }
    .amount { margin-top: 18px; border-top: 2px solid #ed0012; padding-top: 18px; }
    .amount strong { color: #ed0012; font-size: 24px; }
    .foot { padding: 18px 26px 24px; color: #625b74; font-size: 13px; }
    .actions { width: min(760px, calc(100% - 32px)); margin: 0 auto 24px; display: flex; gap: 10px; justify-content: flex-end; }
    button { border: 0; border-radius: 7px; background: #ed0012; color: #fff; padding: 11px 14px; font-weight: 800; cursor: pointer; }
    @media print { .actions { display: none; } body { background: #fff; } .receipt { box-shadow: none; margin: 0; width: 100%; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
  <main class="receipt">
    <section class="head">
      <img src="${logoUrl}" alt="KFA logo">
      <div><h1>KFA Music Academy</h1><p>Fee Payment Receipt</p></div>
    </section>
    <section class="body">
      <div class="meta">
        <div class="box"><span>Receipt No</span><strong>${receipt.receiptNo}</strong></div>
        <div class="box"><span>Date</span><strong>${receipt.date}</strong></div>
        <div class="box"><span>Student</span><strong>${receipt.studentName}</strong></div>
        <div class="box"><span>Branch</span><strong>${receipt.branch}</strong></div>
      </div>
      <div class="rows amount">
        <div class="box"><span>Fee For</span><strong>${receipt.item}</strong></div>
        <div class="box"><span>Fee Type</span><strong>${receipt.feeType}</strong></div>
        <div class="box"><span>Total Amount</span><strong>${money(receipt.totalAmount)}</strong></div>
        <div class="box"><span>Amount Paid</span><strong>${money(receipt.paidAmount)}</strong></div>
        <div class="box"><span>Due Amount</span><strong>${money(receipt.dueAmount)}</strong></div>
        <div class="box"><span>Status</span><strong>${receipt.status}</strong></div>
      </div>
    </section>
    <section class="foot">This is a computer-generated receipt from KFA Music Academy.</section>
  </main>
</body>
</html>`
}

export function downloadReceipt(receipt) {
  const blob = new Blob([receiptHtml(receipt)], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${receipt.receiptNo}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function openReceipt(receipt) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(receiptHtml(receipt))
  win.document.close()
}

export function whatsappReceiptUrl(receipt) {
  const phone = String(receipt.phone || '').replace(/\D/g, '')
  const target = phone.length === 10 ? `91${phone}` : phone
  const message = `Hi ${receipt.studentName}, your KFA fee payment receipt ${receipt.receiptNo} is ready. Paid: ${money(receipt.paidAmount)}. Due: ${money(receipt.dueAmount)}. Thank you.`
  return `https://wa.me/${target || ''}?text=${encodeURIComponent(message)}`
}
