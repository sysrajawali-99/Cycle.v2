# Protokol Keamanan Data PT Rajawali Cycle Indonesia

Dokumen ini mendefinisikan aturan permanen perlindungan integritas data operasional dan keuangan. Aturan ini wajib dipatuhi pada setiap pengembangan, pembaruan, dan rilis sistem.

---

### A. Kunci dan Struktur Data
1. Dilarang mengubah nama key penyimpanan (`STORAGE_KEYS` dan key di `rajawali_app_state`), dan dilarang mengubah arti atau tipe field yang sudah ada. Perubahan hanya boleh menambah field baru yang opsional.
2. Dilarang mengubah nilai yang sudah tersimpan (misalnya status `H/A/I/S/O`). Nilai baru hanya ditambahkan; nilai lama tetap valid.
3. Dilarang menghapus atau memigrasi data lama. Jika migrasi mutlak perlu, harus bersifat menambah, idempotent (aman dijalankan berulang), dan dijelaskan dulu ke pemilik sebelum dikerjakan.

---

### B. Identitas Record
4. Setiap record di setiap koleksi wajib punya id yang STABIL. Record lama memakai id deterministik dari kunci alami (contoh: COA = code, kurs = code mata uang). UUID acak hanya untuk record yang baru dibuat user. id tidak boleh berubah setelah ditetapkan.
5. Koleksi baru wajib mendefinisikan kunci uniknya sebelum dipakai dan mendaftarkannya di satu registri terpusat.

---

### C. Sinkronisasi dan Penyimpanan
6. Merge tidak boleh melewati record, dan tidak boleh menghasilkan array kosong dari input yang tidak kosong. Array kosong tidak boleh menimpa data yang tidak kosong, baik di lokal maupun di server.
7. Hapus data hanya dengan soft delete (`deletedAt`) saat user benar-benar menghapus. Dilarang menandai `deletedAt` karena id tidak cocok.
8. Data bawaan (seed) hanya dimuat jika key BELUM ADA di lokal DAN di server.
9. Klien hanya mengirim key yang berubah. Dilarang mengirim data saat startup, reconnect, atau setelah menerima data dari server.
10. Perubahan pada `storageService.ts`, `vpsSyncService.ts`, `server.ts` bagian `/api/vps` dan socket, serta `server/vpsDatabase.ts` tergolong BERISIKO TINGGI: jelaskan dampaknya dan jalankan `npm run check:data` sebelum dinyatakan selesai.

---

### D. Cara Kerja
11. Setiap tugas diakhiri dengan "Laporan Keamanan Data":
    * (a) key atau koleksi yang tersentuh,
    * (b) konfirmasi tidak ada key atau field yang diganti namanya atau dihapus,
    * (c) hasil `npm run check:data`,
    * (d) daftar file yang diubah.
    * Tidak boleh push sebelum pemilik mengonfirmasi.
