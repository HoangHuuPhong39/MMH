# HỆ THỐNG ÔN THI & TRẮC NGHIỆM NHẬP MÔN MẬT MÃ HỌC (NMMMH)

Ứng dụng web ôn tập và làm bài thi thử trắc nghiệm chạy trực tiếp trên máy của bạn, tổng hợp toàn diện các đề thi, bài tập và ảnh chụp màn hình các khóa môn **Nhập môn Mật mã học (NMMMH)**.

---

## 🚀 CÁCH KHỞI CHẠY NHANH

Bạn có thể chạy ứng dụng theo **2 cách cực kỳ đơn giản**:

### Cách 1: Chạy bằng file Batch (Khuyên dùng)
- Trong thư mục `NMMMH`, bạn chỉ cần nháy đúp chuột vào file:
  👉 **`CHAY_WEB_ON_THI_NMMMH.bat`** (hoặc `filetest\start_web.bat`)
- Máy sẽ tự động bật máy chủ cục bộ và mở trình duyệt tại: **`http://localhost:3000/index.html`**

### Cách 2: Mở trực tiếp bằng trình duyệt (Không cần server)
- Vào thư mục `NMMMH\filetest` và nháy đúp trực tiếp vào file **`index.html`** bằng trình duyệt bất kỳ (Chrome, Edge, Cốc Cốc, Firefox...).
- Web đã được tích hợp sẵn toàn bộ dữ liệu offline `questions_data.js` và hình ảnh nên chạy 100% không lo lỗi CORS hay cần mạng internet.

---

## 📊 THỐNG KÊ NGÂN HÀNG DỮ LIỆU ĐỀ THI
- **Tổng số câu hỏi độc bản:** **132 câu hỏi chuẩn** (đã đối sánh và lọc bỏ hơn 70 câu trùng lặp giữa các đề docx, pdf và ảnh chụp).
- **Tất cả 132 câu đều có:**
  - Lựa chọn 4 đáp án (A, B, C, D).
  - Đáp án đúng đã được kiểm chứng và giải chính xác.
  - Hộp **Lời giải chi tiết** giải thích rõ công thức toán học và lý thuyết môn mật mã (cách tính cấp phần tử, thặng dư bậc 2, Euclid mở rộng, S-Box, MixColumns AES, khóa RC4, mã hóa/giải mã RSA, ElGamal, Merkle-Hellman...).
  - Đầy đủ hình ảnh bảng tính, ma trận và sơ đồ minh họa trích xuất từ đề gốc.

---

## 🌟 CÁC TÍNH NĂNG CHÍNH CỦA ỨNG DỤNG

1. **📚 Cẩm Nang Lý Thuyết & Công Thức 5 Chương (MỚI CẬP NHẬT):**
   - Biên soạn chi tiết bám sát trọn vẹn slide bài giảng và tài liệu môn học:
     - **Chương 1:** Tổng quan Mật mã học, An toàn thông tin (CIA), mô hình hệ mật $(P, C, K, E, D)$, các hệ mật cổ điển (Caesar, Affine, Vigenère, Khóa chạy, Vernam/OTP, Hill, Hoán vị).
     - **Chương 2:** Hệ mật khóa bí mật, kiến trúc mạng Feistel vs SPN, chuẩn DES & 3DES, chuẩn AES (Rijndael) và toán học trên $GF(2^8)$, hàm $xtime()$, bảng so sánh 5 chế độ mã khối (ECB, CBC, CFB, OFB, CTR), mã dòng RC4 (KSA & PRGA).
     - **Chương 3:** Cơ sở toán học (Euclid mở rộng, phi Euler, cấp phần tử, phần tử sinh, thặng dư bậc 2, nhân bình phương có lặp) và các hệ mật khóa công khai (RSA, ElGamal, Rabin, Merkle-Hellman, đường cong Elliptic ECC).
     - **Chương 4:** Hàm băm mật mã (3 tính chất an toàn, Merkle-Damgard, Birthday Attack), mã xác thực MAC/HMAC, chữ ký số (RSA, ElGamal) và hạ tầng khóa công khai PKI / chứng thư số CA X.509.
     - **Chương 5:** Quản trị khóa trong mạng, sơ đồ phân phối khóa Blom, giao thức thỏa thuận khóa Diffie-Hellman & phòng chống tấn công Man-in-the-Middle, hệ thống Kerberos (AS/TGS & timestamp).
     - **Phụ lục Ma Trận Đề Thi Chuẩn:** Bảng phân bổ 40 câu hỏi thi chính thức theo từng chuẩn đầu ra CLO1 & CLO2.
   - Hỗ trợ thanh chuyển nhanh từng chương, ô tìm kiếm lý thuyết tức thì, hộp cảnh báo "Bẫy trắc nghiệm giảng viên hay gài", và nút 1-chạm liên kết trực tiếp tới các câu trắc nghiệm tương ứng.
2. **⚡ Tách Riêng 2 Bài Luyện Tập Chuyên Sâu:**
   - **Bài Luyện Tập 1: Lý Thuyết (80 câu):** Ôn luyện các câu hỏi định nghĩa, phân loại mật mã đối xứng / bất đối xứng, kiến trúc mạng Feistel vs SPN, các chế độ mã khối (ECB, CBC, OFB, CTR), đặc tả số vòng và kích thước khối AES/DES/Rijndael, hàm băm SHA/MD5, chữ ký số và nhận định đúng/sai. Hỗ trợ ôn luyện và thi thử riêng 40 câu lý thuyết (40 phút).
   - **Bài Luyện Tập 2: Bài Tập Tính Toán (52 câu):** Ôn luyện chuyên sâu các dạng bài tính toán modulo, thuật toán Euclid mở rộng, tìm nghịch đảo, tính cấp phần tử, phi Euler, thặng dư bậc hai mod p, bảng thế S-box, phép nhân đa thức xtime trên GF(2^8), MixColumns, mã hóa/giải mã RSA, ElGamal, Rabin, Hill, Caesar, Vigenere, đường cong Elliptic... Hỗ trợ ôn luyện và thi thử riêng 40 câu bài tập (50 phút).
3. **Dashboard Tổng quan & Ma Trận Tiến Độ:** Thống kê tiến độ ôn tập riêng cho cả 2 phần Lý thuyết và Bài tập, danh sách 6 bộ đề thi chuẩn (Đề 1, Đề 2, Đề 3, Đề 4, Đề Giữa kỳ, Đề Thi Mẫu KMA) và danh sách chuyên đề kiến thức.
4. **Chế độ Ôn tập Tương tác:** Hỗ trợ lọc nhanh theo Dạng bài (Tất cả / Chỉ Lý thuyết / Chỉ Bài tập), lọc theo Bộ đề, Chuyên đề, hoặc Trạng thái (Đúng / Sai / Chưa làm / Đánh dấu sao). Chọn đáp án nhận ngay phản hồi Đúng/Sai sinh động, xem lời giải chi tiết và công thức.
5. **Phòng Thi thử Bấm giờ Đa chế độ:** Hỗ trợ thi Đề Chuẩn Tổng Hợp (40 câu ngẫu nhiên), Thi Chuyên Đề Lý Thuyết (40 câu), Thi Chuyên Đề Bài Tập Tính Toán (40 câu), hoặc thi theo từng Bộ đề. Đồng hồ đếm ngược, ma trận điều hướng câu hỏi, nộp bài tính điểm thang 10 và xem lại toàn bộ bài làm.
6. **Sổ tay Câu hay Sai:** Tự động ghi lại các câu bạn từng chọn sai để luyện riêng cho đến khi nắm vững.
7. **Tra cứu & Tìm kiếm tức thì:** Tìm kiếm theo từ khóa kết hợp lọc nhanh theo dạng bài Lý thuyết / Bài tập.
8. **Giao diện hiện đại & Đa nền tảng:** Hỗ trợ Dark/Light mode, hiệu ứng âm thanh, phím tắt (Mũi tên trái/phải để chuyển câu, phím 1-2-3-4 hoặc A-B-C-D để chọn đáp án).
