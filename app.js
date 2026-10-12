const SUPABASE_URL = 'https://tqpmdiwkcppxzvvguiwk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcG1kaXdrY3BweHp2dmd1aXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NjU3MDgsImV4cCI6MjEwNzE0MTcwOH0.JEiiVxf5kuiuP4lS1n1sqoqe_xR8q0sgHPQBwF_wAJI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Aplikasi
let isLoginMode = true;
let currentUser = null;
let currentProfile = null;

let keranjang = [];
let daftarProduk = [];
let kategoriList = JSON.parse(localStorage.getItem('pos_kategori_list')) || ['Makanan', 'Minuman', 'Snack', 'Sembako'];
let kategoriAktif = 'Semua';
let tipePesananAktif = 'Dine In';
let metodeDipilih = 'Tunai';

let stateOrders = [];
let stateReservasi = [];
let stateExpenses = [];
let stateAdminUsers = [];

let html5QrScanner = null;
let scanTargetIsForm = false;
let varianSuhuDipilih = 'Ice';

function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch(e){}
  }
}

// ================= MODAL & UI KONTROL (WINDOW SCOPE EXPORT) =================
window.toggleMobileMenu = function() {
  const sidebar = document.getElementById('sidebar-app');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (!sidebar || !backdrop) return;
  const isClosed = sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
};

window.tutupMobileMenu = function() {
  const sidebar = document.getElementById('sidebar-app');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (backdrop) backdrop.classList.add('hidden');
};

window.bukaSheetPesananMobile = function() {
  const backdrop = document.getElementById('modal-mobile-checkout-backdrop');
  if (backdrop) {
    backdrop.classList.remove('hidden');
    backdrop.classList.add('flex');
    renderKeranjang();
    refreshIcons();
  }
};

window.tutupSheetPesananMobile = function() {
  const backdrop = document.getElementById('modal-mobile-checkout-backdrop');
  if (backdrop) {
    backdrop.classList.add('hidden');
    backdrop.classList.remove('flex');
  }
};

window.sinkronkanFormOrder = function(inputEl, field) {
  const val = inputEl.value;
  if (field === 'nama') {
    const desktopInput = document.getElementById('order-nama-pelanggan');
    const mobileInput = document.getElementById('order-nama-pelanggan-mobile');
    if (desktopInput && desktopInput !== inputEl) desktopInput.value = val;
    if (mobileInput && mobileInput !== inputEl) mobileInput.value = val;
  } else if (field === 'meja') {
    const desktopInput = document.getElementById('order-no-meja');
    const mobileInput = document.getElementById('order-no-meja-mobile');
    if (desktopInput && desktopInput !== inputEl) desktopInput.value = val;
    if (mobileInput && mobileInput !== inputEl) mobileInput.value = val;
  }
};

window.bukaModalFormProduk = function(editData = null) {
  const form = document.getElementById('form-kelola-produk');
  if (form) form.reset();
  const idEl = document.getElementById('form-prod-id');
  if (idEl) idEl.value = '';
  const base64El = document.getElementById('form-prod-image-base64');
  if (base64El) base64El.value = '';
  const imgEl = document.getElementById('preview-foto-img');
  if (imgEl) { imgEl.src = ''; imgEl.classList.add('hidden'); }
  const iconEl = document.getElementById('preview-foto-icon');
  if (iconEl) iconEl.classList.remove('hidden');

  if (editData) {
    const titleEl = document.getElementById('modal-produk-title');
    if (titleEl) titleEl.innerText = 'Edit Menu / Produk';
    if (idEl) idEl.value = editData.id;
    document.getElementById('form-prod-nama').value = editData.name || '';
    document.getElementById('form-prod-harga').value = editData.price || '';
    document.getElementById('form-prod-kategori').value = editData.category || (kategoriList[0] || 'Makanan');
    document.getElementById('form-prod-barcode').value = editData.barcode || '';
    if (editData.image_url) {
      if (base64El) base64El.value = editData.image_url;
      if (imgEl) { imgEl.src = editData.image_url; imgEl.classList.remove('hidden'); }
      if (iconEl) iconEl.classList.add('hidden');
    }
  } else {
    const titleEl = document.getElementById('modal-produk-title');
    if (titleEl) titleEl.innerText = 'Tambah Menu / Produk Baru';
  }

  const modal = document.getElementById('modal-produk-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalFormProduk = function() {
  const modal = document.getElementById('modal-produk-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.bukaModalFormPengeluaran = function(editData = null) {
  const form = document.getElementById('form-kelola-pengeluaran');
  if (form) form.reset();
  const idEl = document.getElementById('form-exp-id');
  if (idEl) idEl.value = '';

  if (editData) {
    const titleEl = document.getElementById('modal-pengeluaran-title');
    if (titleEl) titleEl.innerText = 'Ubah Catatan Pengeluaran';
    if (idEl) idEl.value = editData.id;
    document.getElementById('form-exp-title').value = editData.title || '';
    document.getElementById('form-exp-amount').value = editData.amount || '';
    document.getElementById('form-exp-category').value = editData.category || 'Operasional';
    document.getElementById('form-exp-notes').value = editData.notes || '';
  } else {
    const titleEl = document.getElementById('modal-pengeluaran-title');
    if (titleEl) titleEl.innerText = 'Catat Pengeluaran Baru';
  }

  const modal = document.getElementById('modal-pengeluaran-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalFormPengeluaran = function() {
  const modal = document.getElementById('modal-pengeluaran-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.bukaModalReservasi = function() {
  const form = document.getElementById('form-reservasi-baru');
  if (form) form.reset();
  const idEl = document.getElementById('edit-res-id');
  if (idEl) idEl.value = '';
  const title = document.getElementById('modal-res-title');
  if (title) title.innerText = 'Reservasi Meja Baru';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const waktuEl = document.getElementById('res-waktu');
  if (waktuEl) waktuEl.value = now.toISOString().slice(0, 16);

  const modal = document.getElementById('modal-reservasi-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalReservasiManual = function() {
  const modal = document.getElementById('modal-reservasi-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.bukaModalEditOrder = function(orderId) {
  const order = stateOrders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('edit-order-id').value = order.id;
  document.getElementById('edit-order-nama').value = order.customer_name || '';
  document.getElementById('edit-order-meja').value = order.table_number || '';
  document.getElementById('edit-order-tipe').value = order.order_type || 'Dine In';
  document.getElementById('edit-order-metode').value = order.payment_method || 'Tunai';

  const modal = document.getElementById('modal-edit-order-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.tutupModalEditOrder = function() {
  const modal = document.getElementById('modal-edit-order-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.bukaModalScanner = function(forFormInput = false) {
  scanTargetIsForm = forFormInput;
  const modal = document.getElementById('modal-scanner-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  if (window.Html5Qrcode) {
    html5QrScanner = new Html5Qrcode("scanner-reader");
    html5QrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        tutupModalScanner();
        if (scanTargetIsForm) {
          const bEl = document.getElementById('form-prod-barcode');
          if (bEl) bEl.value = decodedText;
        } else {
          const cpEl = document.getElementById('cari-produk');
          if (cpEl) cpEl.value = decodedText;
          filterProduk();
          const cocok = daftarProduk.find(p => p.barcode === decodedText);
          if (cocok) mulaiTambahItem(cocok.id);
        }
      },
      () => {}
    ).catch(err => {
      alert('Tidak dapat mengakses kamera: ' + err);
      tutupModalScanner();
    });
  }
};

window.tutupModalScanner = function() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    }).catch(() => {});
  }
  const modal = document.getElementById('modal-scanner-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.bukaModalLupaSandi = function() {
  document.getElementById('form-minta-link-reset')?.reset();
  document.getElementById('form-input-sandi-baru')?.reset();
  document.getElementById('form-minta-link-reset')?.classList.remove('hidden');
  document.getElementById('view-menunggu-verifikasi')?.classList.add('hidden');
  document.getElementById('form-input-sandi-baru')?.classList.add('hidden');
  document.getElementById('lupa-sandi-alert')?.classList.add('hidden');

  const modal = document.getElementById('modal-lupa-sandi-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalLupaSandi = function() {
  const modal = document.getElementById('modal-lupa-sandi-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

// ================= FITUR TONG SAMPAH TRANSAKSI KASIR =================
window.hapusKeSampah = async function(orderId) {
  if (!confirm('Pindahkan transaksi ini ke tong sampah? Transaksi akan disimpan selama 30 hari.')) return;

  const waktuHapus = new Date().toISOString();
  const { error } = await supabaseClient
    .from('orders')
    .update({ deleted_at: waktuHapus })
    .eq('id', orderId)
    .eq('user_id', currentUser.id);

  if (error) {
    alert('Gagal memindahkan ke sampah: ' + error.message);
  } else {
    const order = stateOrders.find(o => o.id === orderId);
    if (order) order.deleted_at = waktuHapus;
    updateSemuaUI();
  }
};

window.bukaModalSampah = function() {
  renderTabelSampah();
  const modal = document.getElementById('modal-sampah-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalSampah = function() {
  const modal = document.getElementById('modal-sampah-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

function renderTabelSampah() {
  const tbody = document.getElementById('table-sampah-body');
  if (!tbody) return;

  const listSampah = stateOrders.filter(o => o.deleted_at !== null && o.deleted_at !== undefined);

  if (listSampah.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Tong sampah kosong.</td></tr>`;
    return;
  }

  const sekarang = new Date();

  tbody.innerHTML = listSampah.map(o => {
    const orderNo = o.order_number || (o.id ? o.id.toString().slice(0, 8) : '-');
    const pelanggan = o.customer_name || (o.table_number ? `Meja ${o.table_number}` : 'Umum');
    
    const tglHapus = new Date(o.deleted_at);
    const selisihHari = Math.floor((sekarang - tglHapus) / (1000 * 60 * 60 * 24));
    const sisaHari = Math.max(0, 30 - selisihHari);

    return `
      <tr class="hover:bg-rose-50/40 transition">
        <td class="py-3 px-2 font-bold text-slate-800">#${orderNo}</td>
        <td class="py-3 px-2 text-slate-600">${pelanggan}</td>
        <td class="py-3 px-2 font-bold text-slate-800">Rp ${Number(o.total_price).toLocaleString('id-ID')}</td>
        <td class="py-3 px-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">${sisaHari} hari lagi</span>
        </td>
        <td class="py-3 px-2 text-center">
          <div class="inline-flex items-center space-x-1.5">
            <button onclick="pulihkanTransaksi('${o.id}')" class="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-2.5 py-1 rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center space-x-1">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i><span>Pulihkan</span>
            </button>
            <button onclick="hapusPermanenTransaksi('${o.id}')" class="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 px-2.5 py-1 rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center space-x-1">
              <i data-lucide="trash" class="w-3.5 h-3.5"></i><span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

window.pulihkanTransaksi = async function(orderId) {
  const { error } = await supabaseClient.from('orders').update({ deleted_at: null }).eq('id', orderId).eq('user_id', currentUser.id);
  if (error) {
    alert('Gagal memulihkan transaksi: ' + error.message);
  } else {
    const order = stateOrders.find(o => o.id === orderId);
    if (order) order.deleted_at = null;
    renderTabelSampah();
    updateSemuaUI();
  }
};

window.hapusPermanenTransaksi = async function(orderId) {
  if (!confirm('Peringatan: Transaksi ini akan DIHAPUS PERMANEN. Lanjutkan?')) return;
  await supabaseClient.from('order_items').delete().eq('order_id', orderId);
  const { error } = await supabaseClient.from('orders').delete().eq('id', orderId).eq('user_id', currentUser.id);
  if (error) {
    alert('Gagal menghapus permanen: ' + error.message);
  } else {
    stateOrders = stateOrders.filter(o => o.id !== orderId);
    renderTabelSampah();
    updateSemuaUI();
  }
};

// ================= MODAL ADMIN DURASI & SAMPAH =================
window.bukaModalDurasiAdmin = function(userId) {
  const user = stateAdminUsers.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('modal-durasi-user-id').value = user.id;
  document.getElementById('modal-durasi-subtitle').innerText = `${user.store_name} (${user.full_name})`;

  const now = new Date();
  const startStr = user.active_from ? new Date(user.active_from).toISOString().slice(0, 10) : now.toISOString().slice(0, 10);
  document.getElementById('input-durasi-start').value = startStr;

  if (user.expires_at) {
    document.getElementById('input-durasi-end').value = new Date(user.expires_at).toISOString().slice(0, 10);
  } else {
    const endDefault = new Date();
    endDefault.setDate(endDefault.getDate() + 30);
    document.getElementById('input-durasi-end').value = endDefault.toISOString().slice(0, 10);
  }

  const modal = document.getElementById('modal-admin-durasi-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalDurasiAdmin = function() {
  const modal = document.getElementById('modal-admin-durasi-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.setPresetDurasi = function(hari) {
  const startVal = document.getElementById('input-durasi-start').value || new Date().toISOString().slice(0, 10);
  const startDate = new Date(startVal);
  startDate.setDate(startDate.getDate() + hari);
  document.getElementById('input-durasi-end').value = startDate.toISOString().slice(0, 10);
};

window.simpanDurasiAdmin = async function() {
  const userId = document.getElementById('modal-durasi-user-id').value;
  const startStr = document.getElementById('input-durasi-start').value;
  const endStr = document.getElementById('input-durasi-end').value;

  if (!startStr || !endStr) {
    alert('Tanggal mulai dan tanggal berakhir harus diisi!');
    return;
  }

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  endDate.setHours(23, 59, 59, 999);

  if (endDate < startDate) {
    alert('Tanggal berakhir tidak boleh mendahului tanggal mulai!');
    return;
  }

  const { error } = await supabaseClient
    .from('user_profiles')
    .update({
      active_from: startDate.toISOString(),
      expires_at: endDate.toISOString(),
      status: 'active'
    })
    .eq('id', userId);

  if (error) {
    alert('Gagal mengatur masa aktif: ' + error.message);
  } else {
    const user = stateAdminUsers.find(u => u.id === userId);
    if (user) {
      user.active_from = startDate.toISOString();
      user.expires_at = endDate.toISOString();
      user.status = 'active';
    }
    tutupModalDurasiAdmin();
    renderTabelAdmin();
    alert('Masa aktif toko berhasil disimpan!');
  }
};

window.adminBuangUserKeSampah = async function(userId) {
  const user = stateAdminUsers.find(u => u.id === userId);
  if (!user) return;

  const konfirmasi = confirm(`Pindahkan toko "${user.store_name}" (Pemilik: ${user.full_name}) ke tong sampah? Akun akan disimpan selama 30 hari.`);
  if (!konfirmasi) return;

  const waktuHapus = new Date().toISOString();
  const { error } = await supabaseClient
    .from('user_profiles')
    .update({ deleted_at: waktuHapus })
    .eq('id', userId);

  if (error) {
    alert('Gagal memindahkan ke tong sampah: ' + error.message);
  } else {
    user.deleted_at = waktuHapus;
    renderTabelAdmin();
  }
};

window.bukaModalSampahAdmin = function() {
  renderTabelSampahAdmin();
  const modal = document.getElementById('modal-admin-sampah-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.tutupModalSampahAdmin = function() {
  const modal = document.getElementById('modal-admin-sampah-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

function renderTabelSampahAdmin() {
  const tbody = document.getElementById('table-admin-sampah-body');
  if (!tbody) return;

  const usersSampah = stateAdminUsers.filter(u => !!u.deleted_at);

  if (usersSampah.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Tong sampah toko kosong.</td></tr>`;
    return;
  }

  const sekarang = new Date();

  tbody.innerHTML = usersSampah.map(u => {
    const tglHapus = new Date(u.deleted_at);
    const selisihHari = Math.floor((sekarang - tglHapus) / (1000 * 60 * 60 * 24));
    const sisaHari = Math.max(0, 30 - selisihHari);

    return `
      <tr class="hover:bg-rose-50/40 transition">
        <td class="py-3 px-2 font-bold text-slate-800">${u.store_name}</td>
        <td class="py-3 px-2 font-semibold text-slate-700">${u.full_name}</td>
        <td class="py-3 px-2 text-slate-500 font-mono text-[11px]">${u.email}</td>
        <td class="py-3 px-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">${sisaHari} hari lagi</span>
        </td>
        <td class="py-3 px-2 text-center">
          <div class="inline-flex items-center space-x-1.5">
            <button onclick="adminPulihkanUser('${u.id}')" class="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-2.5 py-1 rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center space-x-1">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i><span>Pulihkan</span>
            </button>
            <button onclick="adminHapusUserPermanen('${u.id}')" class="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 px-2.5 py-1 rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center space-x-1">
              <i data-lucide="trash" class="w-3.5 h-3.5"></i><span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

window.adminPulihkanUser = async function(userId) {
  const { error } = await supabaseClient
    .from('user_profiles')
    .update({ deleted_at: null })
    .eq('id', userId);

  if (error) {
    alert('Gagal memulihkan akun toko: ' + error.message);
  } else {
    const user = stateAdminUsers.find(u => u.id === userId);
    if (user) user.deleted_at = null;
    renderTabelSampahAdmin();
    renderTabelAdmin();
    alert('Akun toko berhasil dipulihkan!');
  }
};

window.adminHapusUserPermanen = async function(userId) {
  const user = stateAdminUsers.find(u => u.id === userId);
  if (!user) return;

  const konfirmasi = confirm(`PERINGATAN: Toko "${user.store_name}" akan DIHAPUS PERMANEN beserta seluruh data produk & transaksi. Lanjutkan?`);
  if (!konfirmasi) return;

  await supabaseClient.from('orders').delete().eq('user_id', userId);
  await supabaseClient.from('products').delete().eq('user_id', userId);
  await supabaseClient.from('reservations').delete().eq('user_id', userId);
  await supabaseClient.from('expenses').delete().eq('user_id', userId);

  const { error } = await supabaseClient
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    alert('Gagal menghapus permanen: ' + error.message);
  } else {
    stateAdminUsers = stateAdminUsers.filter(u => u.id !== userId);
    renderTabelSampahAdmin();
    renderTabelAdmin();
    alert('Akun toko berhasil dihapus secara permanen.');
  }
};

// ================= AUTHENTICATION & MULTI-TENANT ROLE =================
const viewAuth = document.getElementById('view-auth');
const viewAdmin = document.getElementById('view-admin');
const viewPos = document.getElementById('view-pos');

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const regFields = document.getElementById('reg-fields');
const rowLupaSandi = document.getElementById('row-lupa-sandi');
const authForm = document.getElementById('auth-form');
const authAlert = document.getElementById('auth-alert');
const btnAuthSubmit = document.getElementById('btn-auth-submit');

tabLogin?.addEventListener('click', () => {
  isLoginMode = true;
  tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-sm transition';
  tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
  regFields?.classList.add('hidden');
  rowLupaSandi?.classList.remove('hidden');
  if (btnAuthSubmit) btnAuthSubmit.innerText = 'Masuk ke Kasir';
  const sub = document.getElementById('auth-subtitle');
  if (sub) sub.innerText = 'Masuk ke sistem kasir toko Anda';
});

tabRegister?.addEventListener('click', () => {
  isLoginMode = false;
  tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-sm transition';
  tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
  regFields?.classList.remove('hidden');
  rowLupaSandi?.classList.add('hidden');
  if (btnAuthSubmit) btnAuthSubmit.innerText = 'Daftar Kasir Baru';
  const sub = document.getElementById('auth-subtitle');
  if (sub) sub.innerText = 'Daftarkan toko Anda untuk mulai menggunakan kasir';
});

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;

  authAlert?.classList.add('hidden');
  if (btnAuthSubmit) btnAuthSubmit.disabled = true;

  if (isLoginMode) {
    if (btnAuthSubmit) btnAuthSubmit.innerText = 'Memeriksa kredensial...';
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      if (btnAuthSubmit) {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.innerText = 'Masuk ke Kasir';
      }
      if (authAlert) {
        authAlert.className = 'mt-4 text-center text-xs p-3 rounded-xl font-medium bg-rose-50 text-rose-600 border border-rose-200';
        authAlert.innerText = 'Gagal masuk: ' + error.message;
        authAlert.classList.remove('hidden');
      }
      return;
    }

    const { data: prof } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!prof) {
      currentUser = data.user;
      currentProfile = { role: 'user', status: 'active', store_name: 'Toko Saya' };
      bukaLayarAplikasi();
      return;
    }

    if (prof.deleted_at && prof.role !== 'admin') {
      await supabaseClient.auth.signOut();
      if (btnAuthSubmit) {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.innerText = 'Masuk ke Kasir';
      }
      if (authAlert) {
        authAlert.className = 'mt-4 text-center text-xs p-3.5 rounded-xl font-semibold bg-rose-50 text-rose-700 border border-rose-200';
        authAlert.innerHTML = `⚠️ <strong>Akun Dinonaktifkan!</strong><br>Akun toko Anda berada di tong sampah / dinonaktifkan oleh administrator.`;
        authAlert.classList.remove('hidden');
      }
      return;
    }

    if (prof.role !== 'admin' && prof.expires_at) {
      const tglSekarang = new Date();
      const tglBerakhir = new Date(prof.expires_at);
      if (tglSekarang > tglBerakhir) {
        await supabaseClient.from('user_profiles').update({ status: 'pending' }).eq('id', prof.id);
        prof.status = 'pending';
      }
    }

    if (prof.status === 'pending' && prof.role !== 'admin') {
      await supabaseClient.auth.signOut();
      if (btnAuthSubmit) {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.innerText = 'Masuk ke Kasir';
      }
      if (authAlert) {
        authAlert.className = 'mt-4 text-center text-xs p-3.5 rounded-xl font-semibold bg-amber-50 text-amber-800 border border-amber-200';
        authAlert.innerHTML = `⚠️ <strong>Akun Belum Aktif / Masa Berlaku Habis!</strong><br>Silakan hubungi Super Admin untuk mengaktifkan akun toko Anda.`;
        authAlert.classList.remove('hidden');
      }
      return;
    }

    currentUser = data.user;
    currentProfile = prof;
    bukaLayarAplikasi();

  } else {
    const fullName = document.getElementById('reg-fullname').value.trim();
    const storeName = document.getElementById('reg-storename').value.trim();
    const whatsapp = document.getElementById('reg-whatsapp').value.trim();

    if (!fullName || !storeName || !whatsapp) {
      if (btnAuthSubmit) btnAuthSubmit.disabled = false;
      alert('Semua data registrasi wajib diisi!');
      return;
    }

    if (btnAuthSubmit) btnAuthSubmit.innerText = 'Mendaftarkan akun...';

    const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, store_name: storeName, whatsapp: whatsapp }
      }
    });

    if (authErr) {
      if (btnAuthSubmit) {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.innerText = 'Daftar Kasir Baru';
      }
      if (authAlert) {
        authAlert.className = 'mt-4 text-center text-xs p-3 rounded-xl font-medium bg-rose-50 text-rose-600 border border-rose-200';
        authAlert.innerText = 'Pendaftaran gagal: ' + authErr.message;
        authAlert.classList.remove('hidden');
      }
      return;
    }

    if (authData?.user) {
      await supabaseClient.from('user_profiles').insert([{
        id: authData.user.id,
        full_name: fullName,
        store_name: storeName,
        whatsapp: whatsapp,
        email: email,
        role: 'user',
        status: 'pending',
        active_from: null,
        expires_at: null,
        deleted_at: null
      }]);

      await supabaseClient.auth.signOut();
      authForm.reset();
      tabLogin.click();

      if (btnAuthSubmit) btnAuthSubmit.disabled = false;
      if (authAlert) {
        authAlert.className = 'mt-4 text-center text-xs p-4 rounded-2xl font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 leading-relaxed';
        authAlert.innerHTML = `✅ <strong>Pendaftaran Berhasil!</strong><br>Data toko Anda tersimpan dan saat ini <strong>menunggu persetujuan Admin</strong>.`;
        authAlert.classList.remove('hidden');
      }
    }
  }
});

function terapkanNamaTokoKeUI(namaToko) {
  const storeNameFinal = namaToko || 'Toko Saya';
  document.querySelectorAll('.app-store-name-text').forEach(e => e.innerText = storeNameFinal);
  document.querySelectorAll('.struk-store-name').forEach(e => e.innerText = storeNameFinal);
  
  const elLabelStore = document.getElementById('label-user-store');
  if (elLabelStore) elLabelStore.innerText = storeNameFinal;
  
  const elBadgeDesk = document.getElementById('sidebar-store-badge');
  if (elBadgeDesk) elBadgeDesk.innerText = storeNameFinal;
  
  document.querySelectorAll('.mobile-store-badge').forEach(e => e.innerText = storeNameFinal);
}

function bukaLayarAplikasi() {
  if (btnAuthSubmit) btnAuthSubmit.disabled = false;
  viewAuth?.classList.add('hidden');

  if (currentProfile?.role === 'admin') {
    viewAdmin?.classList.remove('hidden');
    viewPos?.classList.add('hidden');
    const adminEmailEl = document.getElementById('label-admin-email');
    if (adminEmailEl) adminEmailEl.innerText = currentUser.email;
    muatDataAdmin();
  } else {
    viewAdmin?.classList.add('hidden');
    viewPos?.classList.remove('hidden');

    const userLabelEl = document.getElementById('label-user');
    if (userLabelEl) userLabelEl.innerText = currentProfile?.full_name || currentUser.email;
    terapkanNamaTokoKeUI(currentProfile?.store_name);

    inisialisasiPengaturan();
    pindahTab('dashboard');
    muatProduk();
    muatUlangSemuaData();
  }
  refreshIcons();
}

window.keluarSesi = async function() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  viewAdmin?.classList.add('hidden');
  viewPos?.classList.add('hidden');
  viewAuth?.classList.remove('hidden');
  const pwdInput = document.getElementById('input-password');
  if (pwdInput) pwdInput.value = '';
  if (authAlert) authAlert.classList.add('hidden');
  tutupMobileMenu();
  refreshIcons();
};

async function cekSesiAktif() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      currentUser = session.user;
      const { data: prof } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      currentProfile = prof || { role: 'user', status: 'active', store_name: 'Toko Saya' };

      if (currentProfile.deleted_at && currentProfile.role !== 'admin') {
        keluarSesi();
        return;
      }

      if (currentProfile.role !== 'admin' && currentProfile.expires_at) {
        if (new Date() > new Date(currentProfile.expires_at)) {
          await supabaseClient.from('user_profiles').update({ status: 'pending' }).eq('id', currentProfile.id);
          currentProfile.status = 'pending';
        }
      }

      if (currentProfile.status === 'pending' && currentProfile.role !== 'admin') {
        keluarSesi();
        return;
      }
      bukaLayarAplikasi();
    } else {
      viewAuth?.classList.remove('hidden');
      viewAdmin?.classList.add('hidden');
      viewPos?.classList.add('hidden');
    }
  } catch (e) {
    viewAuth?.classList.remove('hidden');
  }
  refreshIcons();
}

// ================= PRODUK & PENCARIAN REAKTIF =================
async function muatProduk() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('user_id', currentUser.id);

    if (!error && data) {
      daftarProduk = data;
      renderKategoriTabs();
      filterProduk();
    }
    const elTotalMenu = document.getElementById('dash-total-menu');
    if (elTotalMenu) elTotalMenu.innerText = daftarProduk.length;
  } catch (e) {}
}

async function muatUlangSemuaData() {
  if (!currentUser) return;
  try {
    const resOrd = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (!resOrd.error && resOrd.data) stateOrders = resOrd.data;
  } catch (err) {}

  try {
    const resRes = await supabaseClient
      .from('reservations')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (!resRes.error && resRes.data) stateReservasi = resRes.data;
  } catch (err) {}

  try {
    const resExp = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (!resExp.error && resExp.data) stateExpenses = resExp.data;
  } catch (err) {}

  updateSemuaUI();
}

function filterProduk() {
  const inputEl = document.getElementById('cari-produk');
  const q = (inputEl ? inputEl.value : '').toLowerCase().trim();

  const filtered = daftarProduk.filter(p => {
    const cocokNama = (p.name || '').toLowerCase().includes(q);
    const cocokBarcode = (p.barcode || '').toLowerCase().includes(q);
    const cocokKat = (kategoriAktif === 'Semua') || ((p.category || 'Makanan').toLowerCase() === kategoriAktif.toLowerCase());
    return (cocokNama || cocokBarcode) && cocokKat;
  });
  renderKartu(filtered);
}

document.getElementById('cari-produk')?.addEventListener('input', () => {
  filterProduk();
});

function renderKartu(items) {
  const grid = document.getElementById('grid-produk');
  if (!grid) return;
  if (items.length === 0) {
    grid.innerHTML = '<p class="text-slate-400 text-xs col-span-full text-center py-12">Produk tidak ditemukan.</p>';
    return;
  }

  grid.innerHTML = items.map(p => {
    const imgTag = p.image_url 
      ? `<img src="${p.image_url}" class="w-full h-24 object-cover rounded-xl mb-2"/>` 
      : `<div class="w-full h-20 bg-slate-100 rounded-xl mb-2 flex items-center justify-center text-slate-300"><i data-lucide="package" class="w-7 h-7"></i></div>`;

    const barcodeBadge = p.barcode ? `<span class="text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-500 font-mono">${p.barcode}</span>` : '';

    return `
      <div class="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-sm hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between relative group">
        <div class="absolute top-2 right-2 z-10">
          <button onclick="event.stopPropagation(); toggleDropdownMenu('${p.id}')" class="w-6 h-6 bg-white/90 backdrop-blur-sm hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-600 shadow-sm transition">
            <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
          </button>
          <div id="dropdown-${p.id}" class="hidden absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-20 text-xs">
            <button onclick="event.stopPropagation(); editProdukById('${p.id}')" class="w-full px-3 py-1.5 text-left font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5">
              <i data-lucide="edit-3" class="w-3.5 h-3.5 text-blue-500"></i>
              <span>Edit</span>
            </button>
            <button onclick="event.stopPropagation(); hapusProduk('${p.id}')" class="w-full px-3 py-1.5 text-left font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-1.5">
              <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-500"></i>
              <span>Hapus</span>
            </button>
          </div>
        </div>

        <div onclick="mulaiTambahItem('${p.id}')" class="cursor-pointer">
          ${imgTag}
          <div class="flex items-center space-x-1 mb-1">
            <span class="text-[9px] text-emerald-600 font-extrabold uppercase">${p.category || 'Makanan'}</span>
            ${barcodeBadge}
          </div>
          <h3 class="font-bold text-slate-800 text-xs leading-snug line-clamp-1">${p.name}</h3>
        </div>

        <div onclick="mulaiTambahItem('${p.id}')" class="flex justify-between items-center pt-2 mt-1.5 border-t border-slate-100 cursor-pointer">
          <span class="text-emerald-600 font-black text-xs">Rp ${Number(p.price).toLocaleString('id-ID')}</span>
          <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-xs font-bold transition">+</span>
        </div>
      </div>
    `;
  }).join('');
  refreshIcons();
}

// ================= KATEGORI DINAMIS =================
function renderKategoriTabs() {
  const container = document.getElementById('container-filter-kategori');
  const selectForm = document.getElementById('form-prod-kategori');
  if (!container) return;

  let html = `
    <button onclick="filterKategori('Semua')" class="btn-kat px-4 py-1.5 rounded-xl text-xs font-bold ${kategoriAktif === 'Semua' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition shrink-0">
      Semua
    </button>
  `;
  let optHtml = '';

  kategoriList.forEach((k, idx) => {
    const isActive = kategoriAktif === k;
    html += `
      <div class="relative group/kat flex items-center shrink-0 rounded-xl transition ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        <button onclick="filterKategori('${k}')" class="px-3.5 py-1.5 text-xs font-bold">
          ${k}
        </button>
        <div class="flex items-center pr-1.5 space-x-0.5 opacity-60 hover:opacity-100 transition">
          <button onclick="event.stopPropagation(); editNamaKategori('${k}', ${idx})" class="p-1 rounded-md hover:bg-black/10 transition" title="Ubah Nama">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="event.stopPropagation(); hapusKategori('${k}')" class="p-1 rounded-md hover:bg-rose-500 hover:text-white transition" title="Hapus Kategori">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
    optHtml += `<option value="${k}">${k}</option>`;
  });

  container.innerHTML = html;
  if (selectForm) selectForm.innerHTML = optHtml;
  refreshIcons();
}

window.filterKategori = function(kat) {
  kategoriAktif = kat;
  renderKategoriTabs();
  filterProduk();
};

window.tambahKategoriBaruPrompt = function() {
  const nama = prompt('Masukkan nama kategori baru:');
  if (nama && nama.trim()) {
    const kClean = nama.trim();
    if (!kategoriList.includes(kClean)) {
      kategoriList.push(kClean);
      localStorage.setItem('pos_kategori_list', JSON.stringify(kategoriList));
      renderKategoriTabs();
      filterKategori(kClean);
    }
  }
};

window.editNamaKategori = async function(katLama, index) {
  const namaBaru = prompt(`Ubah nama kategori "${katLama}" menjadi:`, katLama);
  if (!namaBaru || !namaBaru.trim() || namaBaru.trim() === katLama) return;

  const namaBaruClean = namaBaru.trim();
  kategoriList[index] = namaBaruClean;
  localStorage.setItem('pos_kategori_list', JSON.stringify(kategoriList));

  try {
    await supabaseClient.from('products').update({ category: namaBaruClean }).eq('category', katLama).eq('user_id', currentUser.id);
    await muatProduk();
  } catch (e) {}

  if (kategoriAktif === katLama) kategoriAktif = namaBaruClean;
  renderKategoriTabs();
  filterProduk();
};

window.hapusKategori = function(kat) {
  if (kategoriList.length <= 1) return alert('Minimal harus ada 1 kategori!');
  if (!confirm(`Hapus kategori "${kat}"?`)) return;

  kategoriList = kategoriList.filter(k => k !== kat);
  localStorage.setItem('pos_kategori_list', JSON.stringify(kategoriList));
  if (kategoriAktif === kat) kategoriAktif = 'Semua';

  renderKategoriTabs();
  filterProduk();
};

// ================= TIPE PESANAN =================
window.setTipePesanan = function(tipe) {
  tipePesananAktif = tipe;
  const btnD = document.getElementById('btn-tipe-dinein');
  const btnT = document.getElementById('btn-tipe-takeaway');
  const btnV = document.getElementById('btn-tipe-delivery');

  [btnD, btnT, btnV].forEach(b => {
    if (b) b.className = 'py-1.5 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
  });
  if (tipe === 'Dine In' && btnD) btnD.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';
  if (tipe === 'Take Away' && btnT) btnT.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';
  if (tipe === 'Delivery' && btnV) btnV.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';

  const btnDM = document.getElementById('btn-tipe-dinein-mobile');
  const btnTM = document.getElementById('btn-tipe-takeaway-mobile');
  const btnVM = document.getElementById('btn-tipe-delivery-mobile');

  [btnDM, btnTM, btnVM].forEach(b => {
    if (b) b.className = 'py-1.5 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
  });
  if (tipe === 'Dine In' && btnDM) btnDM.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';
  if (tipe === 'Take Away' && btnTM) btnTM.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';
  if (tipe === 'Delivery' && btnVM) btnVM.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';

  const miniPrev = document.getElementById('struk-mini-type-preview');
  if (miniPrev) miniPrev.innerText = tipe;
  const miniPrevMob = document.getElementById('struk-mini-type-preview-mobile');
  if (miniPrevMob) miniPrevMob.innerText = tipe;
};

// ================= FORM PRODUK & FOTO =================
window.tanganiUploadFoto = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64El = document.getElementById('form-prod-image-base64');
    if (base64El) base64El.value = e.target.result;
    const imgEl = document.getElementById('preview-foto-img');
    if (imgEl) { imgEl.src = e.target.result; imgEl.classList.remove('hidden'); }
    const iconEl = document.getElementById('preview-foto-icon');
    if (iconEl) iconEl.classList.add('hidden');
  };
  reader.readAsDataURL(file);
};

document.getElementById('form-kelola-produk')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const id = document.getElementById('form-prod-id').value;
  const nama = document.getElementById('form-prod-nama').value.trim();
  const harga = Number(document.getElementById('form-prod-harga').value);
  const kat = document.getElementById('form-prod-kategori').value;
  const barcode = document.getElementById('form-prod-barcode').value.trim();
  const imgUrl = document.getElementById('form-prod-image-base64').value;

  const payload = {
    user_id: currentUser.id,
    store_id: null,
    name: nama,
    price: harga,
    category: kat,
    barcode: barcode || null,
    image_url: imgUrl || null
  };

  let error = null;
  if (id) {
    const res = await supabaseClient.from('products').update(payload).eq('id', id).eq('user_id', currentUser.id);
    error = res.error;
  } else {
    const res = await supabaseClient.from('products').insert([payload]);
    error = res.error;
  }

  if (error) {
    alert('Gagal menyimpan produk: ' + error.message);
  } else {
    tutupModalFormProduk();
    await muatProduk();
  }
});

window.hapusProduk = async function(id) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;
  const { error } = await supabaseClient.from('products').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) alert('Gagal menghapus: ' + error.message);
  else await muatProduk();
};

window.toggleDropdownMenu = function(id) {
  document.querySelectorAll('[id^="dropdown-"]').forEach(d => {
    if (d.id !== 'dropdown-' + id) d.classList.add('hidden');
  });
  const drop = document.getElementById('dropdown-' + id);
  if (drop) drop.classList.toggle('hidden');
};

document.addEventListener('click', () => {
  document.querySelectorAll('[id^="dropdown-"]').forEach(d => d.classList.add('hidden'));
});

window.editProdukById = function(id) {
  const prod = daftarProduk.find(p => p.id === id);
  if (prod) bukaModalFormProduk(prod);
};

// ================= VARIAN & CATATAN =================
window.mulaiTambahItem = function(id) {
  const item = daftarProduk.find(p => p.id === id);
  if (!item) return;

  document.getElementById('modal-opsi-item-id').value = item.id;
  document.getElementById('modal-opsi-item-nama').innerText = item.name;
  document.getElementById('modal-opsi-item-harga').innerText = 'Rp ' + Number(item.price).toLocaleString('id-ID');
  document.getElementById('input-opsi-catatan').value = '';

  const isMinuman = (item.category || '').toLowerCase() === 'minuman';
  const containerSuhu = document.getElementById('container-opsi-suhu');
  
  if (isMinuman) {
    containerSuhu?.classList.remove('hidden');
    setVarianSuhu('Ice');
  } else {
    containerSuhu?.classList.add('hidden');
    varianSuhuDipilih = null;
  }

  const modal = document.getElementById('modal-opsi-item-backdrop');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    refreshIcons();
  }
};

window.setVarianSuhu = function(suhu) {
  varianSuhuDipilih = suhu;
  const btnIce = document.getElementById('btn-varian-ice');
  const btnHot = document.getElementById('btn-varian-hot');

  if (suhu === 'Ice') {
    if (btnIce) btnIce.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-cyan-400 bg-cyan-50 text-cyan-700 shadow-xs';
    if (btnHot) btnHot.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  } else {
    if (btnHot) btnHot.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-orange-400 bg-orange-50 text-orange-700 shadow-xs';
    if (btnIce) btnIce.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  }
  refreshIcons();
};

window.tutupModalOpsiItem = function() {
  const modal = document.getElementById('modal-opsi-item-backdrop');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.konfirmasiTambahDenganOpsi = function() {
  const prodId = document.getElementById('modal-opsi-item-id').value;
  const item = daftarProduk.find(p => p.id === prodId);
  if (!item) return;

  const catatan = document.getElementById('input-opsi-catatan').value.trim() || null;
  const suhu = varianSuhuDipilih;
  const cartKey = `${item.id}_${suhu || 'none'}_${catatan || 'none'}`;

  const exist = keranjang.find(k => k.cartKey === cartKey);
  if (exist) {
    exist.qty += 1;
  } else {
    keranjang.push({
      ...item,
      cartKey: cartKey,
      qty: 1,
      temperature: suhu,
      notes: catatan
    });
  }

  tutupModalOpsiItem();
  renderKeranjang();
};

// ================= RENDER RIWAYAT DASHBOARD =================
document.getElementById('cari-transaksi-dash')?.addEventListener('input', () => {
  renderTabelRiwayatDashboard();
});

function renderTabelRiwayatDashboard() {
  const tbody = document.getElementById('dash-table-body');
  if (!tbody) return;

  const q = (document.getElementById('cari-transaksi-dash')?.value || '').toLowerCase();
  const filteredOrders = stateOrders.filter(o => {
    const isNotDeleted = (o.deleted_at === null || o.deleted_at === undefined);
    const noOrder = (o.order_number || o.id || '').toLowerCase();
    const nama = (o.customer_name || '').toLowerCase();
    const meja = (o.table_number || '').toLowerCase();
    const tipe = (o.order_type || '').toLowerCase();
    return isNotDeleted && (noOrder.includes(q) || nama.includes(q) || meja.includes(q) || tipe.includes(q));
  });

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">${q ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi tercatat.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders.map(o => {
    const orderNo = o.order_number || (o.id ? o.id.toString().slice(0, 8) : '-');
    const waktu = o.created_at ? new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
    const infoPelanggan = o.customer_name ? o.customer_name : (o.table_number ? `Meja ${o.table_number}` : 'Umum');
    const tipeBadge = o.order_type || 'Dine In';
    const metode = o.payment_method || 'Tunai';
    const isQris = metode.toLowerCase().includes('qris');

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-3 font-bold text-slate-800">#${orderNo}</td>
        <td class="py-3 px-3 text-slate-400 text-[11px]">${waktu}</td>
        <td class="py-3 px-3 font-semibold text-slate-700">${infoPelanggan} ${o.table_number && o.customer_name ? `<span class="text-[10px] text-slate-400">(Meja ${o.table_number})</span>` : ''}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${tipeBadge === 'Dine In' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">${tipeBadge}</span>
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${isQris ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">${metode}</span>
        </td>
        <td class="py-3 px-3 text-right font-black text-emerald-600">Rp ${Number(o.total_price).toLocaleString('id-ID')}</td>
        <td class="py-3 px-3 text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="cetakUlangStrukRiwayat('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 rounded-lg transition shadow-2xs" title="Lihat Struk">
              <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="bukaModalEditOrder('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition shadow-2xs" title="Edit Transaksi">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="hapusKeSampah('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition shadow-2xs" title="Hapus ke Tong Sampah">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

function updateSemuaUI() {
  const transaksiAktif = stateOrders.filter(o => o.deleted_at === null || o.deleted_at === undefined);
  const omzet = transaksiAktif.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalPengeluaran = stateExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const saldoBersih = omzet - totalPengeluaran;

  const dashOmzetEl = document.getElementById('dash-omzet');
  if (dashOmzetEl) dashOmzetEl.innerText = 'Rp ' + omzet.toLocaleString('id-ID');
  const dashTrxEl = document.getElementById('dash-transaksi');
  if (dashTrxEl) dashTrxEl.innerText = transaksiAktif.length;
  const dashMenuEl = document.getElementById('dash-total-menu');
  if (dashMenuEl) dashMenuEl.innerText = daftarProduk.length;
  const dashResEl = document.getElementById('dash-total-reservasi');
  if (dashResEl) dashResEl.innerText = stateReservasi.length;

  const omzetEl = document.getElementById('keuangan-total-omzet');
  if (omzetEl) omzetEl.innerText = 'Rp ' + omzet.toLocaleString('id-ID');

  const expEl = document.getElementById('keuangan-total-pengeluaran');
  if (expEl) expEl.innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');

  const expCountEl = document.getElementById('keuangan-jumlah-pengeluaran');
  if (expCountEl) expCountEl.innerText = `${stateExpenses.length} transaksi belanja`;

  const saldoEl = document.getElementById('keuangan-saldo-bersih');
  if (saldoEl) {
    saldoEl.innerText = 'Rp ' + saldoBersih.toLocaleString('id-ID');
    if (saldoBersih < 0) {
      saldoEl.className = 'text-3xl font-black text-rose-400 tracking-tight';
    } else {
      saldoEl.className = 'text-3xl font-black text-emerald-400 tracking-tight';
    }
  }

  let tunai = 0, qris = 0;
  transaksiAktif.forEach(o => {
    const p = Number(o.total_price) || 0;
    if ((o.payment_method || '').toLowerCase().includes('qris')) qris += p;
    else tunai += p;
  });

  const subTunaiEl = document.getElementById('keuangan-sub-tunai');
  if (subTunaiEl) subTunaiEl.innerText = 'Rp ' + tunai.toLocaleString('id-ID');
  const subQrisEl = document.getElementById('keuangan-sub-qris');
  if (subQrisEl) subQrisEl.innerText = 'Rp ' + qris.toLocaleString('id-ID');

  const totalSampah = stateOrders.filter(o => o.deleted_at !== null && o.deleted_at !== undefined).length;
  const badgeSampah = document.getElementById('badge-counter-sampah');
  if (badgeSampah) {
    if (totalSampah > 0) {
      badgeSampah.innerText = totalSampah;
      badgeSampah.classList.remove('hidden');
    } else {
      badgeSampah.classList.add('hidden');
    }
  }

  renderTabelRiwayatDashboard();
  renderTabelPengeluaran();
  renderTabelKeuanganPenjualan();
  renderTabelOrder();
  renderTabelReservasi();
  renderKeranjang();

  refreshIcons();
}

// ================= NAVIGASI =================
window.pindahTab = function(tabName) {
  const allTabs = ['dashboard', 'menu', 'keuangan', 'order', 'reservasi', 'pengaturan'];
  allTabs.forEach(t => {
    const sec = document.getElementById('tab-content-' + t);
    const btn = document.getElementById('nav-' + t);
    if (sec) sec.classList.add('hidden');
    if (btn) btn.className = 'sidebar-btn w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition';
  });

  const activeSec = document.getElementById('tab-content-' + tabName);
  const activeBtn = document.getElementById('nav-' + tabName);
  if (activeSec) activeSec.classList.remove('hidden');
  if (activeBtn) activeBtn.className = 'sidebar-btn w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition';

  tutupMobileMenu();
  refreshIcons();
  muatUlangSemuaData();
};

// ================= PENGATURAN TOKO =================
const inputToko = document.getElementById('setting-nama-toko');
const inputFooter = document.getElementById('setting-footer-struk');

function inisialisasiPengaturan() {
  if (inputToko && inputFooter) {
    const storeName = currentProfile?.store_name || localStorage.getItem('pos_nama') || 'Toko Saya';
    const footerText = currentProfile?.receipt_footer || localStorage.getItem('pos_foot') || 'Terima kasih atas kunjungan Anda!';

    inputToko.value = storeName;
    inputFooter.value = footerText;

    terapkanNamaTokoKeUI(storeName);

    const ft = document.getElementById('struk-footer-text');
    if (ft) ft.innerText = footerText;
  }

  const cloudQris = currentProfile?.qris_image || localStorage.getItem('pos_qris_foto_base64');
  if (cloudQris) {
    const qrisField = document.getElementById('setting-qris-base64');
    if (qrisField) qrisField.value = cloudQris;
    const previewImg = document.getElementById('preview-setting-qris-img');
    const placeholder = document.getElementById('preview-setting-qris-placeholder');
    if (previewImg && placeholder) {
      previewImg.src = cloudQris;
      previewImg.classList.remove('hidden');
      placeholder.classList.add('hidden');
    }
  }
}

window.tanganiUploadQRISGaleri = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    const qrisField = document.getElementById('setting-qris-base64');
    if (qrisField) qrisField.value = base64;
    const previewImg = document.getElementById('preview-setting-qris-img');
    const placeholder = document.getElementById('preview-setting-qris-placeholder');
    if (previewImg && placeholder) {
      previewImg.src = base64;
      previewImg.classList.remove('hidden');
      placeholder.classList.add('hidden');
    }
  };
  reader.readAsDataURL(file);
};

document.getElementById('btn-simpan-pengaturan')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-simpan-pengaturan');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Menyimpan ke Cloud...';
  }

  const namaBaru = inputToko?.value.trim() || 'Toko Saya';
  const footerBaru = inputFooter?.value.trim() || 'Terima kasih atas kunjungan Anda!';
  const fotoQris = document.getElementById('setting-qris-base64')?.value || null;

  localStorage.setItem('pos_nama', namaBaru);
  localStorage.setItem('pos_foot', footerBaru);
  if (fotoQris) localStorage.setItem('pos_qris_foto_base64', fotoQris);

  if (currentUser) {
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        store_name: namaBaru,
        receipt_footer: footerBaru,
        qris_image: fotoQris
      })
      .eq('id', currentUser.id);

    if (error) {
      alert('Gagal menyimpan ke cloud: ' + error.message);
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Simpan Pengaturan';
      }
      return;
    }

    if (currentProfile) {
      currentProfile.store_name = namaBaru;
      currentProfile.receipt_footer = footerBaru;
      currentProfile.qris_image = fotoQris;
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerText = 'Simpan Pengaturan';
  }

  terapkanNamaTokoKeUI(namaBaru);

  const ft = document.getElementById('struk-footer-text');
  if (ft) ft.innerText = footerBaru;

  alert('Pengaturan toko berhasil disimpan!');
});

// Inisialisasi Aplikasi Saat Halaman Dibuka
refreshIcons();
cekSesiAktif();