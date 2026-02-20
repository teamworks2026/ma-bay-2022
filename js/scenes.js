// js/scenes.js
// Bạn đổi EXPECTED_CODE theo ý bạn (2022 / 2202 ...).
const EXPECTED_CODE = "2022";

// Quy ước lưu tiến độ
const STORAGE_CODE = "SMB2022_CODE";  // mảng chữ số đã lấy theo thứ tự
const STORAGE_USED = "SMB2022_USED";  // đánh dấu hotspot đã ăn

// Mỗi hotspot: id, pos (x y z), normal (x y z), rewardDigit (nếu đúng), decoy (nếu bẫy)
const SCENES = {
  rome: {
    title: "ROME – Tour Rome Avanti",
    model: "scenes/roma.glb",
    hint: "Gợi ý: nhìn quanh các khu vực có ánh đèn vàng / cổng vòm / ghế ngoài trời.",
    hotspots: [
      // ✅ ví dụ: 2 chữ số nằm trong Rome (đủ 4 số tổng)
      { id: "hs1", pos: [0, 1, 0], normal: [0, 1, 0], rewardDigit: "2" },
      { id: "hs2", pos: [1, 1, 0], normal: [0, 1, 0], rewardDigit: "0" },

      // ❌ bẫy (click sẽ báo sai)
      { id: "hs3", pos: [-1, 1, 0], normal: [0, 1, 0], decoy: true },
      { id: "hs4", pos: [0, 0.5, 1], normal: [0, 1, 0], decoy: true },
    ],
  },
  tokyo: {
    title: "TOKYO",
    model: "scenes/tokyo.glb",
    hint: "Gợi ý: tìm các góc có biển hiệu / đèn neon / nóc nhà.",
    hotspots: [
      { id: "hs1", pos: [0, 1, 0], normal: [0, 1, 0], rewardDigit: "2" },
      { id: "hs2", pos: [1, 1, 0], normal: [0, 1, 0], decoy: true },
      { id: "hs3", pos: [-1, 1, 0], normal: [0, 1, 0], decoy: true },
      { id: "hs4", pos: [0, 0.5, 1], normal: [0, 1, 0], decoy: true },
    ],
  },
  bangkok: {
    title: "BANGKOK",
    model: "scenes/bangkok.glb",
    hint: "Gợi ý: nhìn quanh các tượng / cột / góc vườn.",
    hotspots: [
      { id: "hs1", pos: [0, 1, 0], normal: [0, 1, 0], rewardDigit: "2" },
      { id: "hs2", pos: [1, 1, 0], normal: [0, 1, 0], decoy: true },
      { id: "hs3", pos: [-1, 1, 0], normal: [0, 1, 0], decoy: true },
      { id: "hs4", pos: [0, 0.5, 1], normal: [0, 1, 0], decoy: true },
    ],
  },
};