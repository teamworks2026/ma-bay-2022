const EXPECTED_CODE = "2022";
const STORAGE_CODE = "SMB2022_CODE";
const STORAGE_USED = "SMB2022_USED";

const SCENES = {
  rome: {
    title: "ROME – Tour Rome Avanti",
    file: "roma.glb",
    hint: "Gợi ý: nhìn quanh các khu vực đèn vàng / cổng vòm / ghế ngoài trời.",
    hotspots: [
      { id:"hs1", pos:[ 0, 2, 0], rewardDigit:"2" },
      { id:"hs2", pos:[ 2, 2, 0], rewardDigit:"0" },
      { id:"hs3", pos:[-2, 2, 0], decoy:true },
      { id:"hs4", pos:[ 0, 1, 2], decoy:true },
    ]
  },
  tokyo: {
    title: "TOKYO",
    file: "tokyo.glb",
    hint: "Gợi ý: tìm các góc có biển hiệu / đèn neon / nóc nhà.",
    hotspots: [
      { id:"hs1", pos:[ 0, 2, 0], rewardDigit:"2" },
      { id:"hs2", pos:[ 2, 2, 0], decoy:true },
      { id:"hs3", pos:[-2, 2, 0], decoy:true },
      { id:"hs4", pos:[ 0, 1, 2], decoy:true },
    ]
  },
  bangkok: {
    title: "BANGKOK",
    file: "bangkok.glb",
    hint: "Gợi ý: nhìn quanh các tượng / cột / góc vườn.",
    hotspots: [
      { id:"hs1", pos:[ 0, 2, 0], rewardDigit:"2" },
      { id:"hs2", pos:[ 2, 2, 0], decoy:true },
      { id:"hs3", pos:[-2, 2, 0], decoy:true },
      { id:"hs4", pos:[ 0, 1, 2], decoy:true },
    ]
  }
};