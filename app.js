// ============================================================
// 農業記録PWA - メインスクリプト
// ============================================================

// ★★★ GASをデプロイしたらここにURLを貼り付ける ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw66yLy8Vm3Ak4OCO1tXDPfnI9Xe2__lownEbwNjVB0qqZqcc-ckwhUGr9HYKCoeKoc/exec';

// ============================================================
// 初期化
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // 今日の日付をセット
  const today = todayStr();
  document.querySelectorAll('input[type="date"]').forEach(el => {
    el.value = today;
  });

  // 収穫記録：リアルタイム自動計算
  const total   = document.getElementById('hv-total');
  const premium = document.getElementById('hv-premium');
  const price   = document.getElementById('hv-price');

  [total, premium, price].forEach(el => {
    el.addEventListener('input', calcHarvest);
  });

  // Toastエレメント生成
  const toast = document.createElement('div');
  toast.id = 'toast';
  document.body.appendChild(toast);

  // オフライン検知
  window.addEventListener('offline', () => showStatus('オフライン中 - データは送信されません', 'error'));
  window.addEventListener('online',  () => showStatus('オンラインに復帰しました', 'success'));
});

// ============================================================
// タブ切り替え
// ============================================================
function showTab(tabId, btn) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.remove('hidden');
  btn.classList.add('active');
}

// ============================================================
// 収穫記録 自動計算
// ============================================================
function calcHarvest() {
  const total   = parseFloat(document.getElementById('hv-total').value)   || 0;
  const premium = parseFloat(document.getElementById('hv-premium').value) || 0;
  const price   = parseFloat(document.getElementById('hv-price').value)   || 0;

  const rateEl   = document.getElementById('premium-rate-display');
  const revEl    = document.getElementById('revenue-display');

  if (total > 0) {
    const rate = (premium / total * 100).toFixed(1);
    rateEl.textContent = rate + ' %';
  } else {
    rateEl.textContent = '—';
  }

  if (premium > 0 && price > 0) {
    const revenue = Math.round(premium * price);
    revEl.textContent = '¥ ' + revenue.toLocaleString();
  } else {
    revEl.textContent = '—';
  }
}

// ============================================================
// GASへの送信
// ============================================================
async function sendToSheet(sheetName, row, btn) {
  if (!GAS_URL || GAS_URL === 'YOUR_GAS_URL_HERE') {
    showToast('⚠ GAS URLが未設定です', true);
    return false;
  }

  btn.disabled = true;
  btn.textContent = '送信中...';
  showStatus('送信中...', 'sending');

  try {
    // no-corsのためレスポンスbodyは読めないが送信は成功する
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet: sheetName, row: row }),
    });

    showToast('✅ 記録しました');
    showStatus('✓ ' + sheetName.replace(/シート\d：/, '') + ' を記録', 'success');
    return true;

  } catch (err) {
    showToast('❌ 送信失敗（通信を確認してください）', true);
    showStatus('送信失敗', 'error');
    console.error('送信エラー:', err);
    return false;

  } finally {
    btn.disabled = false;
    btn.textContent = '記録する';
  }
}

// ============================================================
// 各フォームの送信処理
// ============================================================

// 作業日誌
async function submitWorklog(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const row = [
    'WL-' + Date.now(),
    val('wl-date'),
    val('wl-field'),
    val('wl-type'),
    parseFloat(val('wl-duration')),
    val('wl-worker'),
    val('wl-weather'),
    val('wl-memo'),
    '',
    new Date().toISOString(),
  ];
  const ok = await sendToSheet('シート3：作業日誌', row, btn);
  if (ok) resetForm('form-worklog', 'wl-date');
}

// 収穫記録
async function submitHarvest(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const total   = parseFloat(val('hv-total'))   || 0;
  const premium = parseFloat(val('hv-premium')) || 0;
  const price   = parseFloat(val('hv-price'))   || 0;
  const rate    = total > 0 ? Math.round(premium / total * 1000) / 10 : 0;
  const revenue = Math.round(premium * price);

  const row = [
    'HL-' + Date.now(),
    val('hv-date'),
    val('hv-field'),
    val('hv-crop'),
    total,
    premium,
    rate,
    price,
    val('hv-dest'),
    revenue,
    val('hv-memo'),
  ];
  const ok = await sendToSheet('シート4：収穫記録', row, btn);
  if (ok) {
    resetForm('form-harvest', 'hv-date');
    document.getElementById('premium-rate-display').textContent = '—';
    document.getElementById('revenue-display').textContent = '—';
  }
}

// 土壌管理
async function submitSoil(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const row = [
    'SL-' + Date.now(),
    val('sl-date'),
    val('sl-field'),
    val('sl-point'),
    parseFloat(val('sl-ph'))       || '',
    parseFloat(val('sl-ec'))       || '',
    parseFloat(val('sl-moisture')) || '',
    parseFloat(val('sl-temp'))     || '',
    val('sl-memo'),
  ];
  const ok = await sendToSheet('シート5：土壌管理', row, btn);
  if (ok) resetForm('form-soil', 'sl-date');
}

// 施肥灌水
async function submitInput(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const row = [
    'IN-' + Date.now(),
    val('in-date'),
    val('in-field'),
    val('in-type'),
    val('in-product'),
    parseFloat(val('in-amount')) || '',
    val('in-unit'),
    '',
    val('in-purpose'),
    val('in-memo'),
  ];
  const ok = await sendToSheet('シート6：施肥灌水', row, btn);
  if (ok) resetForm('form-input', 'in-date');
}

// ============================================================
// ユーティリティ
// ============================================================
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function todayStr() {
  return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

function resetForm(formId, dateId) {
  document.getElementById(formId).reset();
  if (dateId) document.getElementById(dateId).value = todayStr();
}

function showStatus(msg, type) {
  const el = document.getElementById('status-text');
  el.textContent = msg;
  el.className = type || '';
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = isError ? 'error' : '';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
