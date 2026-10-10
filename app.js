const SUPABASE_URL = 'https://tqpmdiwkcppxzvvguiwk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcG1kaXdrY3BweHp2dmd1aXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NjU3MDgsImV4cCI6MjEwNzE0MTcwOH0.JEiiVxf5kuiuP4lS1n1sqoqe_xR8q0sgHPQBwF_wAJI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Aplikasi
let isLoginMode = true;
let currentUser = null;
let currentProfile = null; // Menyimpan data user_profiles

let keranjang = [];
let daftarProduk = [];
let kategoriList = JSON.parse(localStorage.getItem('pos_kategori_list')) || ['Makanan', 'Minuman', 'Snack', 'Sembako'];
let kategoriAktif = 'Semua';
let tipePesananAktif = 'Dine In';
let metodeDipilih = 'Tunai';

let stateOrders = [];
let stateReservasi = [];
let stateExpenses = [];
let stateAdminUsers = []; // Data tabel manajemen admin

let html5QrScanner = null;
let scanTargetIsForm = false;
let varianSuhuDipilih = 'Ice';

function refreshIcons() {
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e){}
  }
}

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

tabLogin.addEventListener('click', () => {
  isLoginMode = true;
  tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-sm transition';
  tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
  regFields.classList.add('hidden');
  rowLupaSandi.classList.remove('hidden');
  btnAuthSubmit.innerText = 'Masuk ke Kasir';
  document.getElementById('auth-subtitle').innerText = 'Masuk ke sistem kasir toko Anda';
});

tabRegister.addEventListener('click', () => {
  isLoginMode = false;
  tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-white text-emerald-700 shadow-sm transition';
  tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition';
  regFields.classList.remove('hidden');
  rowLupaSandi.classList.add('hidden');
  btnAuthSubmit.innerText = 'Daftar Kasir Baru';
  document.getElementById('auth-subtitle').innerText = 'Daftarkan toko Anda untuk mulai menggunakan kasir';
});

// Penanganan Form Login & Register
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value;

  authAlert.classList.add('hidden');
  btnAuthSubmit.disabled = true;

  if (isLoginMode) {
    btnAuthSubmit.innerText = 'Memeriksa kredensial...';
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = 'Masuk ke Kasir';
      authAlert.className = 'mt-4 text-center text-xs p-3 rounded-xl font-medium bg-rose-50 text-rose-600 border border-rose-200';
      authAlert.innerText = 'Gagal masuk: ' + error.message;
      authAlert.classList.remove('hidden');
      return;
    }

    // Periksa status profil pengguna di database
    const { data: prof, error: profErr } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profErr || !prof) {
      // Jika belum ada profile tapi login berhasil (fallback)
      currentUser = data.user;
      currentProfile = { role: 'user', status: 'active', store_name: 'Toko Saya' };
      bukaLayarAplikasi();
      return;
    }

    // Jika akun masih berstatus 'pending', cegah login
    if (prof.status === 'pending' && prof.role !== 'admin') {
      await supabaseClient.auth.signOut();
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = 'Masuk ke Kasir';
      authAlert.className = 'mt-4 text-center text-xs p-3.5 rounded-xl font-semibold bg-amber-50 text-amber-800 border border-amber-200';
      authAlert.innerHTML = `⚠️ <strong>Akun Belum Dikonfirmasi!</strong><br>Pendaftaran toko Anda sedang menunggu persetujuan dari Super Admin. Silakan hubungi admin untuk aktivasi.`;
      authAlert.classList.remove('hidden');
      return;
    }

    currentUser = data.user;
    currentProfile = prof;
    bukaLayarAplikasi();

  } else {
    // Mode Registrasi Lengkap
    const fullName = document.getElementById('reg-fullname').value.trim();
    const storeName = document.getElementById('reg-storename').value.trim();
    const whatsapp = document.getElementById('reg-whatsapp').value.trim();

    if (!fullName || !storeName || !whatsapp) {
      btnAuthSubmit.disabled = false;
      alert('Semua data registrasi wajib diisi!');
      return;
    }

    btnAuthSubmit.innerText = 'Mendaftarkan akun...';

    // 1. Buat User di Supabase Auth
    const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, store_name: storeName, whatsapp: whatsapp }
      }
    });

    if (authErr) {
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.innerText = 'Daftar Kasir Baru';
      authAlert.className = 'mt-4 text-center text-xs p-3 rounded-xl font-medium bg-rose-50 text-rose-600 border border-rose-200';
      authAlert.innerText = 'Pendaftaran gagal: ' + authErr.message;
      authAlert.classList.remove('hidden');
      return;
    }

    if (authData?.user) {
      // 2. Simpan Data ke tabel user_profiles dengan status PENDING
      await supabaseClient.from('user_profiles').insert([{
        id: authData.user.id,
        full_name: fullName,
        store_name: storeName,
        whatsapp: whatsapp,
        email: email,
        role: 'user',
        status: 'pending' // Wajib menunggu konfirmasi admin
      }]);

      await supabaseClient.auth.signOut(); // Jangan login otomatis
      authForm.reset();
      tabLogin.click();

      btnAuthSubmit.disabled = false;
      authAlert.className = 'mt-4 text-center text-xs p-4 rounded-2xl font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 leading-relaxed';
      authAlert.innerHTML = `✅ <strong>Pendaftaran Berhasil!</strong><br>Data toko Anda telah tersimpan dan saat ini <strong>menunggu konfirmasi dari Admin</strong>. Anda baru dapat login setelah disetujui.`;
      authAlert.classList.remove('hidden');
    }
  }
});

// Arahkan tampilan sesuai Role (Admin vs User Toko)
function bukaLayarAplikasi() {
  btnAuthSubmit.disabled = false;
  viewAuth.classList.add('hidden');

  if (currentProfile?.role === 'admin') {
    // Tampilan Khusus Super Admin
    viewAdmin.classList.remove('hidden');
    viewPos.classList.add('hidden');
    document.getElementById('label-admin-email').innerText = currentUser.email;
    muatDataAdmin();
  } else {
    // Tampilan Kasir Toko
    viewAdmin.classList.add('hidden');
    viewPos.classList.remove('hidden');

    document.getElementById('label-user').innerText = currentProfile?.full_name || currentUser.email;
    document.getElementById('label-user-store').innerText = currentProfile?.store_name || 'Kasir Toko';
    document.getElementById('sidebar-store-badge').innerText = currentProfile?.store_name || 'Toko Aktif';
    document.querySelectorAll('.header-brand-text').forEach(e => e.innerText = currentProfile?.store_name || 'KASIR ONLINE');
    document.querySelectorAll('.struk-store-name').forEach(e => e.innerText = currentProfile?.store_name || 'KASIR ONLINE');

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
  viewAdmin.classList.add('hidden');
  viewPos.classList.add('hidden');
  viewAuth.classList.remove('hidden');
  document.getElementById('input-password').value = '';
  authAlert.classList.add('hidden');
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

      if (currentProfile.status === 'pending' && currentProfile.role !== 'admin') {
        keluarSesi();
        return;
      }
      bukaLayarAplikasi();
    } else {
      viewAuth.classList.remove('hidden');
      viewAdmin.classList.add('hidden');
      viewPos.classList.add('hidden');
    }
  } catch (e) {
    viewAuth.classList.remove('hidden');
  }
  refreshIcons();
}

// ================= FITUR LUPA KATA SANDI (OTP SUPABASE) =================
window.bukaModalLupaSandi = function() {
  document.getElementById('form-minta-otp').reset();
  document.getElementById('form-verifikasi-otp').reset();
  document.getElementById('form-minta-otp').classList.remove('hidden');
  document.getElementById('form-verifikasi-otp').classList.add('hidden');
  document.getElementById('lupa-sandi-alert').classList.add('hidden');

  document.getElementById('modal-lupa-sandi-backdrop').classList.remove('hidden');
  document.getElementById('modal-lupa-sandi-backdrop').classList.add('flex');
};

window.tutupModalLupaSandi = function() {
  document.getElementById('modal-lupa-sandi-backdrop').classList.add('hidden');
  document.getElementById('modal-lupa-sandi-backdrop').classList.remove('flex');
};

let emailTargetLupaSandi = '';

// Step 1: Kirim Kode OTP
document.getElementById('form-minta-otp').addEventListener('submit', async (e) => {
  e.preventDefault();
  emailTargetLupaSandi = document.getElementById('lupa-input-email').value.trim();
  const btn = document.getElementById('btn-kirim-otp');
  const alertEl = document.getElementById('lupa-sandi-alert');

  btn.disabled = true;
  btn.innerText = 'Mengirim OTP...';
  alertEl.classList.add('hidden');

  // Supabase kirim recovery OTP ke email
  const { error } = await supabaseClient.auth.resetPasswordForEmail(emailTargetLupaSandi);

  btn.disabled = false;
  btn.innerText = 'Kirim Kode OTP';

  if (error) {
    alertEl.className = 'text-[11px] p-2.5 rounded-xl text-center font-medium bg-rose-50 text-rose-600 border border-rose-200 block';
    alertEl.innerText = 'Gagal: ' + error.message;
  } else {
    document.getElementById('form-minta-otp').classList.add('hidden');
    document.getElementById('form-verifikasi-otp').classList.remove('hidden');
  }
});

// Step 2: Verifikasi OTP & Update Password Baru
document.getElementById('form-verifikasi-otp').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tokenOtp = document.getElementById('lupa-input-otp').value.trim();
  const sandiBaru = document.getElementById('lupa-input-pwd-baru').value;
  const btn = document.getElementById('btn-reset-pwd-final');
  const alertEl = document.getElementById('lupa-sandi-alert');

  btn.disabled = true;
  btn.innerText = 'Memverifikasi...';
  alertEl.classList.add('hidden');

  // 1. Verifikasi Kode OTP token
  const { data: verifData, error: verifErr } = await supabaseClient.auth.verifyOtp({
    email: emailTargetLupaSandi,
    token: tokenOtp,
    type: 'recovery'
  });

  if (verifErr) {
    btn.disabled = false;
    btn.innerText = 'Verifikasi & Ganti Sandi';
    alertEl.className = 'text-[11px] p-2.5 rounded-xl text-center font-medium bg-rose-50 text-rose-600 border border-rose-200 block';
    alertEl.innerText = 'Kode OTP salah atau kedaluwarsa!';
    return;
  }

  // 2. Jika valid, update kata sandi
  const { error: updErr } = await supabaseClient.auth.updateUser({
    password: sandiBaru
  });

  btn.disabled = false;
  btn.innerText = 'Verifikasi & Ganti Sandi';

  if (updErr) {
    alertEl.className = 'text-[11px] p-2.5 rounded-xl text-center font-medium bg-rose-50 text-rose-600 border border-rose-200 block';
    alertEl.innerText = 'Gagal ubah sandi: ' + updErr.message;
  } else {
    alert('Kata sandi berhasil diperbarui! Silakan login dengan sandi baru Anda.');
    tutupModalLupaSandi();
    await supabaseClient.auth.signOut();
  }
});

// ================= PANEL SUPER ADMIN LOGIC =================
async function muatDataAdmin() {
  try {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      stateAdminUsers = data;
      renderTabelAdmin();
    }
  } catch (err) {}
}

function renderTabelAdmin() {
  const tbody = document.getElementById('table-admin-users-body');
  if (!tbody) return;

  const total = stateAdminUsers.length;
  const pending = stateAdminUsers.filter(u => u.status === 'pending').length;
  const active = stateAdminUsers.filter(u => u.status === 'active').length;

  document.getElementById('admin-stat-total').innerText = total;
  document.getElementById('admin-stat-pending').innerText = pending;
  document.getElementById('admin-stat-active').innerText = active;

  const q = (document.getElementById('cari-user-admin')?.value || '').toLowerCase();
  const filtered = stateAdminUsers.filter(u => {
    const n = (u.full_name || '').toLowerCase();
    const s = (u.store_name || '').toLowerCase();
    const e = (u.email || '').toLowerCase();
    return n.includes(q) || s.includes(q) || e.includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">${q ? 'User tidak ditemukan.' : 'Belum ada pendaftar toko.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const waktu = u.created_at ? new Date(u.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
    const isPending = u.status === 'pending';
    const isAdmin = u.role === 'admin';

    let statusBadge = isPending
      ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>`
      : `<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">Aktif</span>`;

    let aksiTombol = `
      <div class="inline-flex items-center space-x-1.5">
        ${isPending ? `
          <button onclick="adminKonfirmasiUser('${u.id}')" class="p-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl transition border border-emerald-200 shadow-2xs" title="Konfirmasi / Setujui Pendaftaran">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        ` : ''}
        ${!isAdmin ? `
          <button onclick="adminHapusUser('${u.id}', '${u.full_name}')" class="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl transition border border-rose-200 shadow-2xs" title="Hapus User & Cabut Akses">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        ` : '<span class="text-[10px] text-slate-400 italic">Super Admin</span>'}
      </div>
    `;

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-3 font-bold text-slate-800">${u.full_name}</td>
        <td class="py-3 px-3 font-semibold text-slate-700">${u.store_name}</td>
        <td class="py-3 px-3 text-slate-500 font-mono">${u.whatsapp}</td>
        <td class="py-3 px-3 text-slate-600">${u.email}</td>
        <td class="py-3 px-3 text-slate-400">${waktu}</td>
        <td class="py-3 px-3">${statusBadge}</td>
        <td class="py-3 px-3 text-center">${aksiTombol}</td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

document.getElementById('cari-user-admin')?.addEventListener('input', renderTabelAdmin);

// Konfirmasi Pendaftar (Status jadi active)
window.adminKonfirmasiUser = async function(userId) {
  if (!confirm('Setujui dan aktifkan toko pengguna ini? Pengguna akan langsung bisa login.')) return;

  const { error } = await supabaseClient
    .from('user_profiles')
    .update({ status: 'active' })
    .eq('id', userId);

  if (error) {
    alert('Gagal konfirmasi: ' + error.message);
  } else {
    const user = stateAdminUsers.find(u => u.id === userId);
    if (user) user.status = 'active';
    renderTabelAdmin();
    alert('Pengguna berhasil diaktifkan!');
  }
};

// Hapus User Toko (Akses langsung hangus)
window.adminHapusUser = async function(userId, nama) {
  if (!confirm(`Hapus toko "${nama}"? Semua hak akses login dan data terkait akan dihapus permanen.`)) return;

  const { error } = await supabaseClient
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    alert('Gagal menghapus: ' + error.message);
  } else {
    stateAdminUsers = stateAdminUsers.filter(u => u.id !== userId);
    renderTabelAdmin();
    alert(`Toko ${nama} berhasil dihapus.`);
  }
};

// ================= FITUR DATA TOKO (MULTI-TENANT FILTER) =================
// Setiap query menu, transaksi, dll otomatis difilter dengan .eq('user_id', currentUser.id)

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
            <i data-lucide="pencil" class="w-3 h-3"></i>
          </button>
          <button onclick="event.stopPropagation(); hapusKategori('${k}')" class="p-1 rounded-md hover:bg-rose-500 hover:text-white transition" title="Hapus Kategori">
            <i data-lucide="x" class="w-3 h-3"></i>
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

  [btnD, btnT, btnV].forEach(b => b.className = 'py-1.5 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 transition');
  if (tipe === 'Dine In') btnD.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';
  if (tipe === 'Take Away') btnT.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';
  if (tipe === 'Delivery') btnV.className = 'py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white shadow-xs transition';

  const miniPrev = document.getElementById('struk-mini-type-preview');
  if (miniPrev) miniPrev.innerText = tipe;
};

// ================= UPLOAD FOTO QRIS =================
window.tanganiUploadQRISGaleri = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById('setting-qris-base64').value = base64;
    const previewImg = document.getElementById('preview-setting-qris-img');
    const placeholder = document.getElementById('preview-setting-qris-placeholder');
    previewImg.src = base64;
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
};

// ================= FORM PRODUK & FOTO =================
window.bukaModalFormProduk = function(editData = null) {
  document.getElementById('form-kelola-produk').reset();
  document.getElementById('form-prod-id').value = '';
  document.getElementById('form-prod-image-base64').value = '';
  document.getElementById('preview-foto-img').src = '';
  document.getElementById('preview-foto-img').classList.add('hidden');
  document.getElementById('preview-foto-icon').classList.remove('hidden');

  if (editData) {
    document.getElementById('modal-produk-title').innerText = 'Edit Menu / Produk';
    document.getElementById('form-prod-id').value = editData.id;
    document.getElementById('form-prod-nama').value = editData.name || '';
    document.getElementById('form-prod-harga').value = editData.price || '';
    document.getElementById('form-prod-kategori').value = editData.category || (kategoriList[0] || 'Makanan');
    document.getElementById('form-prod-barcode').value = editData.barcode || '';
    if (editData.image_url) {
      document.getElementById('form-prod-image-base64').value = editData.image_url;
      document.getElementById('preview-foto-img').src = editData.image_url;
      document.getElementById('preview-foto-img').classList.remove('hidden');
      document.getElementById('preview-foto-icon').classList.add('hidden');
    }
  } else {
    document.getElementById('modal-produk-title').innerText = 'Tambah Menu / Produk Baru';
  }

  document.getElementById('modal-produk-backdrop').classList.remove('hidden');
  document.getElementById('modal-produk-backdrop').classList.add('flex');
  refreshIcons();
};

window.tutupModalFormProduk = function() {
  document.getElementById('modal-produk-backdrop').classList.add('hidden');
  document.getElementById('modal-produk-backdrop').classList.remove('flex');
};

window.tanganiUploadFoto = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('form-prod-image-base64').value = e.target.result;
    document.getElementById('preview-foto-img').src = e.target.result;
    document.getElementById('preview-foto-img').classList.remove('hidden');
    document.getElementById('preview-foto-icon').classList.add('hidden');
  };
  reader.readAsDataURL(file);
};

document.getElementById('form-kelola-produk').addEventListener('submit', async (e) => {
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

// ================= SCANNER BARCODE =================
window.bukaModalScanner = function(forFormInput = false) {
  scanTargetIsForm = forFormInput;
  document.getElementById('modal-scanner-backdrop').classList.remove('hidden');
  document.getElementById('modal-scanner-backdrop').classList.add('flex');

  html5QrScanner = new Html5Qrcode("scanner-reader");
  html5QrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      tutupModalScanner();
      if (scanTargetIsForm) {
        document.getElementById('form-prod-barcode').value = decodedText;
      } else {
        document.getElementById('cari-produk').value = decodedText;
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
};

window.tutupModalScanner = function() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    }).catch(() => {});
  }
  document.getElementById('modal-scanner-backdrop').classList.add('hidden');
  document.getElementById('modal-scanner-backdrop').classList.remove('flex');
};

// ================= RENDER KATALOG =================
function filterProduk() {
  const q = (document.getElementById('cari-produk').value || '').toLowerCase();
  const filtered = daftarProduk.filter(p => {
    const cocokNama = (p.name || '').toLowerCase().includes(q);
    const cocokBarcode = (p.barcode || '').toLowerCase().includes(q);
    const cocokKat = (kategoriAktif === 'Semua') || ((p.category || 'Makanan').toLowerCase() === kategoriAktif.toLowerCase());
    return (cocokNama || cocokBarcode) && cocokKat;
  });
  renderKartu(filtered);
}

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

// ================= MODAL VARIAN SUHU & CATATAN =================
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
    containerSuhu.classList.remove('hidden');
    setVarianSuhu('Ice');
  } else {
    containerSuhu.classList.add('hidden');
    varianSuhuDipilih = null;
  }

  document.getElementById('modal-opsi-item-backdrop').classList.remove('hidden');
  document.getElementById('modal-opsi-item-backdrop').classList.add('flex');
  refreshIcons();
};

window.setVarianSuhu = function(suhu) {
  varianSuhuDipilih = suhu;
  const btnIce = document.getElementById('btn-varian-ice');
  const btnHot = document.getElementById('btn-varian-hot');

  if (suhu === 'Ice') {
    btnIce.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-cyan-400 bg-cyan-50 text-cyan-700 shadow-xs';
    btnHot.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  } else {
    btnHot.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-orange-400 bg-orange-50 text-orange-700 shadow-xs';
    btnIce.className = 'py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  }
  refreshIcons();
};

window.tutupModalOpsiItem = function() {
  document.getElementById('modal-opsi-item-backdrop').classList.add('hidden');
  document.getElementById('modal-opsi-item-backdrop').classList.remove('flex');
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

// ================= KERANJANG =================
window.ubahQty = function(cartKey, d) {
  const i = keranjang.findIndex(k => k.cartKey === cartKey);
  if (i === -1) return;
  keranjang[i].qty += d;
  if (keranjang[i].qty <= 0) keranjang.splice(i, 1);
  renderKeranjang();
};

document.getElementById('btn-reset-keranjang').addEventListener('click', () => {
  keranjang = [];
  renderKeranjang();
});

function hitungTotal() {
  return keranjang.reduce((s, i) => s + (i.price * i.qty), 0);
}

function renderKeranjang() {
  const list = document.getElementById('list-keranjang');
  const totalEl = document.getElementById('total-tagihan');
  const btn = document.getElementById('btn-buka-bayar');
  const counterEl = document.getElementById('label-qty-counter');

  const totalItemCount = keranjang.reduce((s, i) => s + i.qty, 0);
  if (counterEl) counterEl.innerText = `${totalItemCount} item terpilih`;

  if (keranjang.length === 0) {
    list.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-slate-400 py-10">
        <i data-lucide="shopping-cart" class="w-10 h-10 stroke-[1.5] mb-2 text-slate-300"></i>
        <p class="text-xs font-medium">Keranjang masih kosong</p>
      </div>
    `;
    totalEl.innerText = 'Rp 0';
    btn.disabled = true;
    btn.className = 'w-full bg-slate-200 text-slate-400 font-bold py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center space-x-2';
    refreshIcons();
    return;
  }

  list.innerHTML = keranjang.map(k => {
    const subtotal = k.price * k.qty;

    let badgeSuhu = '';
    if (k.temperature === 'Ice') {
      badgeSuhu = '<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-cyan-100 text-cyan-800 mr-1"><i data-lucide="snowflake" class="w-2.5 h-2.5 mr-0.5"></i>Ice</span>';
    } else if (k.temperature === 'Hot') {
      badgeSuhu = '<span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-orange-100 text-orange-800 mr-1"><i data-lucide="flame" class="w-2.5 h-2.5 mr-0.5"></i>Hot</span>';
    }

    const teksCatatan = k.notes ? `<p class="text-[10px] text-amber-600 font-medium italic mt-0.5 truncate">Catatan: "${k.notes}"</p>` : '';

    return `
      <div class="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200/70 text-xs transition">
        <div class="truncate pr-2 flex-1">
          <div class="flex items-center truncate">
            ${badgeSuhu}
            <p class="font-bold text-slate-800 truncate">${k.name}</p>
          </div>
          ${teksCatatan}
          <div class="flex items-center space-x-2 mt-0.5">
            <span class="text-[10px] text-slate-400">@ Rp ${Number(k.price).toLocaleString('id-ID')}</span>
            <span class="text-[11px] font-black text-emerald-600">Rp ${subtotal.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 shrink-0 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
          <button onclick="ubahQty('${k.cartKey}', -1)" class="w-6 h-6 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg font-bold text-xs flex items-center justify-center transition active:scale-95">-</button>
          <span class="w-6 text-center font-black text-slate-800 text-xs">${k.qty}</span>
          <button onclick="ubahQty('${k.cartKey}', 1)" class="w-6 h-6 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg font-bold text-xs flex items-center justify-center transition active:scale-95">+</button>
        </div>
      </div>
    `;
  }).join('');

  const total = hitungTotal();
  totalEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
  btn.disabled = false;
  btn.className = 'w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 cursor-pointer';
  refreshIcons();
}

// ================= MODAL BAYAR =================
const modalBayar = document.getElementById('modal-bayar-backdrop');
document.getElementById('btn-buka-bayar').addEventListener('click', () => {
  const tot = hitungTotal();
  document.getElementById('bayar-modal-total').innerText = 'Rp ' + tot.toLocaleString('id-ID');
  document.getElementById('input-uang-diterima').value = '';
  hitungKembalian();

  const namaP = document.getElementById('order-nama-pelanggan').value.trim();
  const mejaP = document.getElementById('order-no-meja').value.trim();
  document.getElementById('struk-preview-tipe').innerText = tipePesananAktif + (mejaP ? ' • ' + mejaP : '');
  document.getElementById('struk-preview-pelanggan').innerText = namaP ? 'Atas Nama: ' + namaP : 'Pelanggan Umum';

  const qrisFotoGaleri = localStorage.getItem('pos_qris_foto_base64');
  if (qrisFotoGaleri) {
    document.getElementById('img-qris-display').src = qrisFotoGaleri;
  } else {
    document.getElementById('img-qris-display').src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GOPAY_MERCHANT_QRIS_' + tot;
  }

  document.getElementById('qris-nominal-text').innerText = 'Total: Rp ' + tot.toLocaleString('id-ID');

  pilihMetode('Tunai');
  modalBayar.classList.remove('hidden');
  modalBayar.classList.add('flex');
});

document.getElementById('btn-tutup-bayar').addEventListener('click', () => {
  modalBayar.classList.add('hidden');
  modalBayar.classList.remove('flex');
});

function pilihMetode(metode) {
  metodeDipilih = metode;
  const tabT = document.getElementById('tab-metode-tunai');
  const tabN = document.getElementById('tab-metode-nontunai');
  const panT = document.getElementById('panel-tunai');
  const panN = document.getElementById('panel-nontunai');

  if (metode === 'Tunai') {
    tabT.className = 'py-2.5 rounded-xl text-xs font-bold bg-white text-emerald-700 shadow-sm flex items-center justify-center space-x-1.5 transition';
    tabN.className = 'py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition';
    panT.classList.remove('hidden');
    panN.classList.add('hidden');
  } else {
    tabN.className = 'py-2.5 rounded-xl text-xs font-bold bg-white text-emerald-700 shadow-sm flex items-center justify-center space-x-1.5 transition';
    tabT.className = 'py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition';
    panN.classList.remove('hidden');
    panT.classList.add('hidden');
  }
  refreshIcons();
}

document.getElementById('tab-metode-tunai').addEventListener('click', () => pilihMetode('Tunai'));
document.getElementById('tab-metode-nontunai').addEventListener('click', () => pilihMetode('Non-Tunai (QRIS GoPay)'));

window.setUangCepat = function(val) {
  document.getElementById('input-uang-diterima').value = (val === 'pas') ? hitungTotal() : val;
  hitungKembalian();
};

document.getElementById('input-uang-diterima').addEventListener('input', hitungKembalian);

function hitungKembalian() {
  const tot = hitungTotal();
  const bayar = Number(document.getElementById('input-uang-diterima').value) || 0;
  const kembali = bayar - tot;
  const el = document.getElementById('label-kembalian');
  if (kembali < 0) {
    el.innerText = 'Kurang Rp ' + Math.abs(kembali).toLocaleString('id-ID');
    el.className = 'text-base font-extrabold text-rose-500';
  } else {
    el.innerText = 'Rp ' + kembali.toLocaleString('id-ID');
    el.className = 'text-base font-extrabold text-emerald-600';
  }
}

// ================= SIMPAN TRANSAKSI =================
document.getElementById('btn-konfirmasi-bayar').addEventListener('click', async () => {
  if (!currentUser) return;

  const total = hitungTotal();
  const bayar = Number(document.getElementById('input-uang-diterima').value) || 0;
  if (metodeDipilih === 'Tunai' && bayar < total) return alert('Nominal uang tunai diterima masih kurang!');

  const btnBayar = document.getElementById('btn-konfirmasi-bayar');
  btnBayar.disabled = true;
  btnBayar.innerText = 'Menyimpan...';

  const orderNumber = 'ORD-' + Date.now().toString().slice(-6);
  const namaPelanggan = document.getElementById('order-nama-pelanggan').value.trim() || null;
  const noMeja = document.getElementById('order-no-meja').value.trim() || null;

  const nominalBayarFinal = (metodeDipilih === 'Tunai') ? bayar : total;
  const nominalKembalianFinal = (metodeDipilih === 'Tunai') ? Math.max(0, bayar - total) : 0;

  const itemsDetailList = keranjang.map(k => ({
    product_id: k.id,
    name: k.name,
    price: k.price,
    qty: k.qty,
    temperature: k.temperature || null,
    notes: k.notes || null,
    subtotal: k.price * k.qty
  }));

  const payload = {
    user_id: currentUser.id,
    total_price: total,
    payment_method: metodeDipilih,
    status: 'completed',
    order_number: orderNumber,
    order_type: tipePesananAktif,
    customer_name: namaPelanggan,
    table_number: noMeja,
    items_detail: itemsDetailList,
    amount_paid: nominalBayarFinal,
    change_amount: nominalKembalianFinal,
    deleted_at: null
  };

  const { data: newOrder, error: errOrder } = await supabaseClient
    .from('orders')
    .insert([payload])
    .select()
    .single();

  if (errOrder) {
    alert('Gagal simpan transaksi: ' + errOrder.message);
    btnBayar.disabled = false;
    btnBayar.innerText = 'Konfirmasi Pembayaran Selesai';
    return;
  }

  if (newOrder?.id) {
    const itemsOrderTable = keranjang.map(k => {
      let namaLengkap = k.name;
      if (k.temperature) namaLengkap += ` (${k.temperature})`;
      if (k.notes) namaLengkap += ` [${k.notes}]`;

      return {
        order_id: newOrder.id,
        product_id: k.id,
        product_name: namaLengkap,
        temperature: k.temperature || null,
        notes: k.notes || null,
        quantity: k.qty,
        price: k.price
      };
    });
    await supabaseClient.from('order_items').insert(itemsOrderTable);
    
    newOrder.items_detail = itemsDetailList;
    newOrder.amount_paid = nominalBayarFinal;
    newOrder.change_amount = nominalKembalianFinal;

    stateOrders.unshift(newOrder);
    updateSemuaUI();
  }

  modalBayar.classList.add('hidden');
  modalBayar.classList.remove('flex');
  btnBayar.disabled = false;
  btnBayar.innerText = 'Konfirmasi Pembayaran Selesai';

  bukaModalStruk(newOrder || payload, itemsDetailList, nominalBayarFinal, total, nominalKembalianFinal);

  keranjang = [];
  document.getElementById('order-nama-pelanggan').value = '';
  document.getElementById('order-no-meja').value = '';
  renderKeranjang();
  muatUlangSemuaData();
});

// ================= STRUK LENGKAP =================
function bukaModalStruk(orderData, itemsList, uangBayar = null, totalNominal = null, kembalianFix = null) {
  const orderId = orderData.order_number || (orderData.id ? orderData.id.toString().slice(0, 8) : '-');
  const orderTipe = (orderData.order_type || 'Dine In') + 
    (orderData.table_number ? ` (Meja: ${orderData.table_number})` : '') + 
    (orderData.customer_name ? ` - ${orderData.customer_name}` : '');
  const waktu = orderData.created_at ? new Date(orderData.created_at).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
  const tot = (totalNominal !== null && totalNominal !== undefined) ? totalNominal : (Number(orderData.total_price) || 0);
  const metode = orderData.payment_method || 'Tunai';

  document.getElementById('struk-id').innerText = orderId;
  document.getElementById('struk-tanggal').innerText = waktu;
  document.getElementById('struk-tipe-order').innerText = orderTipe;
  document.getElementById('struk-metode').innerText = metode;

  const listItemsEl = document.getElementById('struk-items');
  
  let finalItems = itemsList || [];
  if ((!finalItems || finalItems.length === 0) && orderData.items_detail && Array.isArray(orderData.items_detail)) {
    finalItems = orderData.items_detail;
  }

  if (finalItems && finalItems.length > 0) {
    listItemsEl.innerHTML = finalItems.map(k => {
      const namaItem = k.name || k.product_name || 'Menu';
      const kuantitas = k.qty || k.quantity || 1;
      const hargaSatuan = k.price || 0;
      const totalHarga = k.subtotal || (hargaSatuan * kuantitas);

      const suhuText = k.temperature ? `<span class="text-[9px] font-bold text-slate-500 uppercase">(${k.temperature})</span>` : '';
      const catatanText = k.notes ? `<span class="text-[9px] text-slate-400 italic block mt-0.5">* ${k.notes}</span>` : '';

      return `
        <div class="flex justify-between items-start">
          <div class="pr-2 flex-1">
            <span class="font-bold text-slate-800">${namaItem} ${suhuText}</span>
            ${catatanText}
            <span class="text-[10px] text-slate-400 block">${kuantitas} x Rp ${Number(hargaSatuan).toLocaleString('id-ID')}</span>
          </div>
          <span class="font-bold text-slate-800 shrink-0">Rp ${Number(totalHarga).toLocaleString('id-ID')}</span>
        </div>
      `;
    }).join('');
  } else {
    listItemsEl.innerHTML = `
      <div class="flex justify-between">
        <span>Transaksi Kasir</span>
        <span>Rp ${Number(tot).toLocaleString('id-ID')}</span>
      </div>
    `;
  }

  document.getElementById('struk-total').innerText = 'Rp ' + Number(tot).toLocaleString('id-ID');

  if (metode.toLowerCase().includes('qris')) {
    document.getElementById('struk-bayar').innerText = 'LUNAS (QRIS)';
    document.getElementById('struk-kembali').innerText = 'Rp 0';
  } else {
    let bayarTampil = tot;
    if (uangBayar !== null && uangBayar !== undefined && uangBayar > 0) {
      bayarTampil = uangBayar;
    } else if (orderData.amount_paid && Number(orderData.amount_paid) > 0) {
      bayarTampil = Number(orderData.amount_paid);
    }

    let kembaliTampil = Math.max(0, bayarTampil - tot);
    if (kembalianFix !== null && kembalianFix !== undefined) {
      kembaliTampil = kembalianFix;
    } else if (orderData.change_amount !== undefined && orderData.change_amount !== null) {
      kembaliTampil = Number(orderData.change_amount);
    }

    document.getElementById('struk-bayar').innerText = 'Rp ' + Number(bayarTampil).toLocaleString('id-ID');
    document.getElementById('struk-kembali').innerText = 'Rp ' + Number(kembaliTampil).toLocaleString('id-ID');
  }

  document.getElementById('modal-struk-backdrop').classList.remove('hidden');
  document.getElementById('modal-struk-backdrop').classList.add('flex');
}

// ================= CETAK ULANG STRUK =================
window.cetakUlangStrukRiwayat = async function(orderId) {
  const order = stateOrders.find(o => o.id === orderId);
  if (!order) return;

  let items = [];
  if (order.items_detail && Array.isArray(order.items_detail) && order.items_detail.length > 0) {
    items = order.items_detail;
  } else {
    const { data: itemData } = await supabaseClient
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemData && itemData.length > 0) {
      items = itemData;
      order.items_detail = itemData;
    }
  }

  const bayarTersimpan = order.amount_paid ? Number(order.amount_paid) : order.total_price;
  const kembalianTersimpan = order.change_amount !== undefined ? Number(order.change_amount) : Math.max(0, bayarTersimpan - order.total_price);

  bukaModalStruk(order, items, bayarTersimpan, order.total_price, kembalianTersimpan);
};

document.getElementById('btn-tutup-struk').addEventListener('click', () => {
  document.getElementById('modal-struk-backdrop').classList.add('hidden');
  document.getElementById('modal-struk-backdrop').classList.remove('flex');
});

document.getElementById('btn-cetak').addEventListener('click', () => window.print());

// ================= EDIT TRANSAKSI =================
window.bukaModalEditOrder = function(orderId) {
  const order = stateOrders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('edit-order-id').value = order.id;
  document.getElementById('edit-order-nama').value = order.customer_name || '';
  document.getElementById('edit-order-meja').value = order.table_number || '';
  document.getElementById('edit-order-tipe').value = order.order_type || 'Dine In';
  document.getElementById('edit-order-metode').value = order.payment_method || 'Tunai';

  document.getElementById('modal-edit-order-backdrop').classList.remove('hidden');
  document.getElementById('modal-edit-order-backdrop').classList.add('flex');
};

window.tutupModalEditOrder = function() {
  document.getElementById('modal-edit-order-backdrop').classList.add('hidden');
  document.getElementById('modal-edit-order-backdrop').classList.remove('flex');
};

document.getElementById('form-edit-order').addEventListener('submit', async (e) => {
  e.preventDefault();
  const orderId = document.getElementById('edit-order-id').value;
  const nama = document.getElementById('edit-order-nama').value.trim() || null;
  const meja = document.getElementById('edit-order-meja').value.trim() || null;
  const tipe = document.getElementById('edit-order-tipe').value;
  const metode = document.getElementById('edit-order-metode').value;

  const { error } = await supabaseClient
    .from('orders')
    .update({
      customer_name: nama,
      table_number: meja,
      order_type: tipe,
      payment_method: metode
    })
    .eq('id', orderId)
    .eq('user_id', currentUser.id);

  if (error) {
    alert('Gagal mengubah transaksi: ' + error.message);
  } else {
    const orderIndex = stateOrders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      stateOrders[orderIndex].customer_name = nama;
      stateOrders[orderIndex].table_number = meja;
      stateOrders[orderIndex].order_type = tipe;
      stateOrders[orderIndex].payment_method = metode;
    }
    tutupModalEditOrder();
    updateSemuaUI();
  }
});

// ================= HAPUS KE SAMPAH =================
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

// ================= TONG SAMPAH =================
window.bukaModalSampah = function() {
  renderTabelSampah();
  document.getElementById('modal-sampah-backdrop').classList.remove('hidden');
  document.getElementById('modal-sampah-backdrop').classList.add('flex');
  refreshIcons();
};

window.tutupModalSampah = function() {
  document.getElementById('modal-sampah-backdrop').classList.add('hidden');
  document.getElementById('modal-sampah-backdrop').classList.remove('flex');
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
  if (!confirm('Peringatan: Transaksi ini akan DIHAPUS PERMANEN dan tidak dapat dipulihkan lagi. Lanjutkan?')) return;
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

// ================= FITUR PENGELUARAN (EXPENSES) =================
window.bukaModalFormPengeluaran = function(editData = null) {
  document.getElementById('form-kelola-pengeluaran').reset();
  document.getElementById('form-exp-id').value = '';

  if (editData) {
    document.getElementById('modal-pengeluaran-title').innerText = 'Ubah Catatan Pengeluaran';
    document.getElementById('form-exp-id').value = editData.id;
    document.getElementById('form-exp-title').value = editData.title || '';
    document.getElementById('form-exp-amount').value = editData.amount || '';
    document.getElementById('form-exp-category').value = editData.category || 'Operasional';
    document.getElementById('form-exp-notes').value = editData.notes || '';
  } else {
    document.getElementById('modal-pengeluaran-title').innerText = 'Catat Pengeluaran Baru';
  }

  document.getElementById('modal-pengeluaran-backdrop').classList.remove('hidden');
  document.getElementById('modal-pengeluaran-backdrop').classList.add('flex');
  refreshIcons();
};

window.tutupModalFormPengeluaran = function() {
  document.getElementById('modal-pengeluaran-backdrop').classList.add('hidden');
  document.getElementById('modal-pengeluaran-backdrop').classList.remove('flex');
};

document.getElementById('form-kelola-pengeluaran').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const id = document.getElementById('form-exp-id').value;
  const title = document.getElementById('form-exp-title').value.trim();
  const amount = Number(document.getElementById('form-exp-amount').value);
  const category = document.getElementById('form-exp-category').value;
  const notes = document.getElementById('form-exp-notes').value.trim() || null;

  const payload = {
    user_id: currentUser.id,
    title: title,
    amount: amount,
    category: category,
    notes: notes
  };

  let error = null;
  if (id) {
    const res = await supabaseClient.from('expenses').update(payload).eq('id', id).eq('user_id', currentUser.id);
    error = res.error;
  } else {
    const res = await supabaseClient.from('expenses').insert([payload]);
    error = res.error;
  }

  if (error) {
    alert('Gagal menyimpan pengeluaran: ' + error.message);
  } else {
    tutupModalFormPengeluaran();
    await muatUlangSemuaData();
  }
});

window.editPengeluaranById = function(id) {
  const exp = stateExpenses.find(e => e.id === id);
  if (exp) bukaModalFormPengeluaran(exp);
};

window.hapusPengeluaran = async function(id) {
  if (!confirm('Yakin ingin menghapus catatan pengeluaran ini?')) return;
  const { error } = await supabaseClient.from('expenses').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) {
    alert('Gagal menghapus: ' + error.message);
  } else {
    stateExpenses = stateExpenses.filter(e => e.id !== id);
    updateSemuaUI();
  }
};

function renderTabelPengeluaran() {
  const tbody = document.getElementById('table-pengeluaran-body');
  if (!tbody) return;

  const q = (document.getElementById('cari-pengeluaran')?.value || '').toLowerCase();
  const filtered = stateExpenses.filter(e => {
    const t = (e.title || '').toLowerCase();
    const c = (e.category || '').toLowerCase();
    const n = (e.notes || '').toLowerCase();
    return t.includes(q) || c.includes(q) || n.includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">${q ? 'Pengeluaran tidak ditemukan.' : 'Belum ada catatan pengeluaran.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const waktu = e.created_at ? new Date(e.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-3 text-slate-500">${waktu}</td>
        <td class="py-3 px-3 font-bold text-slate-800">${e.title}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${e.category || 'Operasional'}</span>
        </td>
        <td class="py-3 px-3 text-slate-400 italic">${e.notes || '-'}</td>
        <td class="py-3 px-3 text-right font-black text-rose-600">- Rp ${Number(e.amount).toLocaleString('id-ID')}</td>
        <td class="py-3 px-3 text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="editPengeluaranById('${e.id}')" class="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition" title="Ubah Pengeluaran">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="hapusPengeluaran('${e.id}')" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition" title="Hapus Pengeluaran">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

document.getElementById('cari-pengeluaran')?.addEventListener('input', renderTabelPengeluaran);

function renderTabelKeuanganPenjualan() {
  const tbody = document.getElementById('table-keuangan-penjualan-body');
  if (!tbody) return;

  const q = (document.getElementById('cari-transaksi-keuangan')?.value || '').toLowerCase();
  const transaksiAktif = stateOrders.filter(o => o.deleted_at === null || o.deleted_at === undefined);
  const filtered = transaksiAktif.filter(o => {
    const orderNo = (o.order_number || o.id || '').toLowerCase();
    const nama = (o.customer_name || '').toLowerCase();
    return orderNo.includes(q) || nama.includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">Belum ada transaksi penjualan.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const orderNo = o.order_number || (o.id ? o.id.toString().slice(0, 8) : '-');
    const waktu = o.created_at ? new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
    const pelanggan = o.customer_name ? o.customer_name : (o.table_number ? `Meja ${o.table_number}` : 'Umum');
    const metode = o.payment_method || 'Tunai';

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-3 font-bold text-slate-800">#${orderNo}</td>
        <td class="py-3 px-3 text-slate-400">${waktu}</td>
        <td class="py-3 px-3 font-semibold text-slate-700">${pelanggan}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${metode.toLowerCase().includes('qris') ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">${metode}</span>
        </td>
        <td class="py-3 px-3 text-right font-black text-emerald-600">+ Rp ${Number(o.total_price).toLocaleString('id-ID')}</td>
        <td class="py-3 px-3 text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="cetakUlangStrukRiwayat('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 rounded-lg transition" title="Lihat Struk">
              <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="bukaModalEditOrder('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition" title="Edit Transaksi">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="hapusKeSampah('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition" title="Hapus ke Tong Sampah">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

document.getElementById('cari-transaksi-keuangan')?.addEventListener('input', renderTabelKeuanganPenjualan);

// ================= RENDER TABEL ORDER (SEARCH DI ATAS HEADER) =================
function renderTabelOrder() {
  const tbody = document.getElementById('order-table-body');
  const counterEl = document.getElementById('order-info-counter');
  if (!tbody) return;

  const q = (document.getElementById('cari-order-atas')?.value || '').toLowerCase();
  const transaksiAktif = stateOrders.filter(o => o.deleted_at === null || o.deleted_at === undefined);
  const filtered = transaksiAktif.filter(o => {
    const noOrder = (o.order_number || o.id || '').toLowerCase();
    const nama = (o.customer_name || '').toLowerCase();
    const meja = (o.table_number || '').toLowerCase();
    const tipe = (o.order_type || '').toLowerCase();
    return noOrder.includes(q) || nama.includes(q) || meja.includes(q) || tipe.includes(q);
  });

  if (counterEl) counterEl.innerText = `Menampilkan ${filtered.length} dari ${transaksiAktif.length} pesanan`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">${q ? 'Pesanan tidak ditemukan.' : 'Belum ada daftar order.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const orderNo = o.order_number || (o.id ? o.id.toString().slice(0, 8) : '-');
    const waktu = o.created_at ? new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
    const pelanggan = o.customer_name ? o.customer_name : (o.table_number ? `Meja ${o.table_number}` : 'Umum');
    const tipeBadge = o.order_type || 'Dine In';
    const metode = o.payment_method || 'Tunai';
    const isQris = metode.toLowerCase().includes('qris');

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3.5 px-3 font-bold text-slate-800">#${orderNo}</td>
        <td class="py-3.5 px-3 text-slate-400">${waktu}</td>
        <td class="py-3.5 px-3 font-semibold text-slate-700">
          ${pelanggan} ${o.table_number && o.customer_name ? `<span class="text-[10px] text-slate-400">(Meja ${o.table_number})</span>` : ''}
        </td>
        <td class="py-3.5 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${tipeBadge === 'Dine In' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">${tipeBadge}</span>
        </td>
        <td class="py-3.5 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${isQris ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">${metode}</span>
        </td>
        <td class="py-3.5 px-3 text-right font-black text-emerald-600">Rp ${Number(o.total_price).toLocaleString('id-ID')}</td>
        <td class="py-3.5 px-3 text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="cetakUlangStrukRiwayat('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 rounded-lg transition" title="Lihat Struk">
              <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="bukaModalEditOrder('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition" title="Edit Transaksi">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="hapusKeSampah('${o.id}')" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition" title="Hapus ke Tong Sampah">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

document.getElementById('cari-order-atas')?.addEventListener('input', renderTabelOrder);

// ================= RENDER TABEL RESERVASI =================
function renderTabelReservasi() {
  const tbody = document.getElementById('reservasi-table-body');
  if (!tbody) return;

  const q = (document.getElementById('cari-reservasi')?.value || '').toLowerCase();
  const filtered = stateReservasi.filter(r => {
    const nama = (r.customer_name || '').toLowerCase();
    const meja = (r.table_number || '').toLowerCase();
    const telp = (r.phone || '').toLowerCase();
    return nama.includes(q) || meja.includes(q) || telp.includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">${q ? 'Data reservasi tidak ditemukan.' : 'Belum ada jadwal reservasi.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const waktu = r.reservation_time ? new Date(r.reservation_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3.5 px-3 font-bold text-slate-800">${r.customer_name}</td>
        <td class="py-3.5 px-3 text-slate-500 font-medium">${waktu}</td>
        <td class="py-3.5 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Meja ${r.table_number || '-'}</span>
        </td>
        <td class="py-3.5 px-3 font-semibold text-slate-700">${r.guest_count} Tamu</td>
        <td class="py-3.5 px-3 text-slate-500 font-mono text-[11px]">${r.phone || '-'}</td>
        <td class="py-3.5 px-3">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Terkonfirmasi</span>
        </td>
        <td class="py-3.5 px-3 text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="editReservasiById('${r.id}')" class="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-lg transition" title="Ubah Reservasi">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="hapusReservasi('${r.id}')" class="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 rounded-lg transition" title="Hapus Reservasi">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  refreshIcons();
}

document.getElementById('cari-reservasi')?.addEventListener('input', renderTabelReservasi);

window.editReservasiById = function(id) {
  const r = stateReservasi.find(item => item.id === id);
  if (!r) return;

  document.getElementById('edit-res-id').value = r.id;
  document.getElementById('modal-res-title').innerText = 'Ubah Reservasi Meja';
  document.getElementById('res-nama').value = r.customer_name || '';
  document.getElementById('res-meja').value = r.table_number || '';
  document.getElementById('res-orang').value = r.guest_count || 2;
  document.getElementById('res-telp').value = r.phone || '';

  if (r.reservation_time) {
    const t = new Date(r.reservation_time);
    t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    document.getElementById('res-waktu').value = t.toISOString().slice(0, 16);
  }

  const modalRes = document.getElementById('modal-reservasi-backdrop');
  modalRes.classList.remove('hidden');
  modalRes.classList.add('flex');
};

window.hapusReservasi = async function(id) {
  if (!confirm('Hapus data reservasi ini?')) return;
  const { error } = await supabaseClient.from('reservations').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) {
    alert('Gagal menghapus: ' + error.message);
  } else {
    stateReservasi = stateReservasi.filter(r => r.id !== id);
    updateSemuaUI();
  }
};

window.tutupModalReservasiManual = function() {
  const modalRes = document.getElementById('modal-reservasi-backdrop');
  modalRes.classList.add('hidden');
  modalRes.classList.remove('flex');
};

// ================= RENDER RIWAYAT DASHBOARD =================
document.getElementById('cari-transaksi-dash')?.addEventListener('input', () => {
  renderTabelRiwayatDashboard();
});

function renderTabelRiwayatDashboard() {
  const tbody = document.getElementById('dash-table-body');
  if (!tbody) return;

  const q = (document.getElementById('cari-transaksi-dash').value || '').toLowerCase();
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

  // Dashboard Ringkasan
  document.getElementById('dash-omzet').innerText = 'Rp ' + omzet.toLocaleString('id-ID');
  document.getElementById('dash-transaksi').innerText = transaksiAktif.length;
  document.getElementById('dash-total-menu').innerText = daftarProduk.length;
  document.getElementById('dash-total-reservasi').innerText = stateReservasi.length;

  // Keuangan
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

  refreshIcons();
  muatUlangSemuaData();
};

// ================= PENGATURAN TOKO =================
const inputToko = document.getElementById('setting-nama-toko');
const inputFooter = document.getElementById('setting-footer-struk');

function inisialisasiPengaturan() {
  if (inputToko && inputFooter) {
    inputToko.value = localStorage.getItem('pos_nama') || (currentProfile?.store_name || 'KASIR ONLINE');
    inputFooter.value = localStorage.getItem('pos_foot') || 'Terima kasih atas kunjungan Anda!';
    document.querySelectorAll('.header-brand-text').forEach(e => e.innerText = inputToko.value);
    document.querySelectorAll('.struk-store-name').forEach(e => e.innerText = inputToko.value);
    const ft = document.getElementById('struk-footer-text');
    if (ft) ft.innerText = inputFooter.value;
  }

  const savedQrisFoto = localStorage.getItem('pos_qris_foto_base64');
  if (savedQrisFoto) {
    document.getElementById('setting-qris-base64').value = savedQrisFoto;
    const previewImg = document.getElementById('preview-setting-qris-img');
    const placeholder = document.getElementById('preview-setting-qris-placeholder');
    previewImg.src = savedQrisFoto;
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
  }
}

document.getElementById('btn-simpan-pengaturan')?.addEventListener('click', async () => {
  localStorage.setItem('pos_nama', inputToko.value);
  localStorage.setItem('pos_foot', inputFooter.value);
  
  const fotoQris = document.getElementById('setting-qris-base64').value;
  if (fotoQris) {
    localStorage.setItem('pos_qris_foto_base64', fotoQris);
  }

  // Update juga ke user_profiles di Supabase
  if (currentUser) {
    await supabaseClient
      .from('user_profiles')
      .update({ store_name: inputToko.value })
      .eq('id', currentUser.id);
  }

  document.querySelectorAll('.header-brand-text').forEach(e => e.innerText = inputToko.value);
  document.querySelectorAll('.struk-store-name').forEach(e => e.innerText = inputToko.value);
  const ft = document.getElementById('struk-footer-text');
  if (ft) ft.innerText = inputFooter.value;
  alert('Pengaturan toko dan foto QRIS berhasil disimpan!');
});

// ================= RESERVASI =================
const modalRes = document.getElementById('modal-reservasi-backdrop');
document.getElementById('btn-buka-modal-reservasi')?.addEventListener('click', () => {
  document.getElementById('form-reservasi-baru').reset();
  document.getElementById('edit-res-id').value = '';
  document.getElementById('modal-res-title').innerText = 'Reservasi Meja Baru';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('res-waktu').value = now.toISOString().slice(0, 16);
  modalRes.classList.remove('hidden');
  modalRes.classList.add('flex');
});

document.getElementById('btn-tutup-reservasi')?.addEventListener('click', () => {
  modalRes.classList.add('hidden');
  modalRes.classList.remove('flex');
});

document.getElementById('form-reservasi-baru')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const id = document.getElementById('edit-res-id').value;
  const nama = document.getElementById('res-nama').value.trim();
  const meja = document.getElementById('res-meja').value.trim();
  const orang = Number(document.getElementById('res-orang').value) || 2;
  const telp = document.getElementById('res-telp').value.trim();
  const waktu = document.getElementById('res-waktu').value;

  const payload = {
    user_id: currentUser.id,
    customer_name: nama,
    table_number: meja,
    guest_count: orang,
    phone: telp,
    reservation_time: waktu,
    status: 'confirmed'
  };

  let error = null;
  if (id) {
    const res = await supabaseClient.from('reservations').update(payload).eq('id', id).eq('user_id', currentUser.id);
    error = res.error;
  } else {
    const res = await supabaseClient.from('reservations').insert([payload]);
    error = res.error;
  }

  if (error) {
    alert('Gagal simpan reservasi: ' + error.message);
  } else {
    document.getElementById('form-reservasi-baru').reset();
    modalRes.classList.add('hidden');
    modalRes.classList.remove('flex');
    muatUlangSemuaData();
  }
});

inisialisasiPengaturan();
cekSesiAktif();