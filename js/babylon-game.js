(function () {
  const mix = (a, b, t) => a + (b - a) * t;
  const canvas = document.getElementById("renderCanvas");
  const titleEl = document.getElementById("sceneTitle");
  const hudCodeEl = document.getElementById("hudCode");
  const toastEl = document.getElementById("toast");
  const barEl = document.getElementById("bar");
  const loadTextEl = document.getElementById("loadText");

  const qs = new URLSearchParams(location.search);
  const city = (qs.get("city") || "rome").toLowerCase();
  const sceneCfg = SCENES[city] || SCENES.rome;

  const rootUrl = "./scenes/";
  const fileName = sceneCfg.file || "tokyo.glb";

  console.log("CITY =", city);
  console.log("sceneCfg =", sceneCfg);
  console.log("Loading =", rootUrl + fileName);

  titleEl.textContent = sceneCfg.title;
  function toast(msg, ms=1400){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(()=>toastEl.classList.remove("show"), ms);
  }
  function getCodeArr(){ return JSON.parse(localStorage.getItem(STORAGE_CODE) || "[]"); }
  function setCodeArr(arr){ localStorage.setItem(STORAGE_CODE, JSON.stringify(arr)); renderHUD(); }
  function getUsedMap(){ return JSON.parse(localStorage.getItem(STORAGE_USED) || "{}"); }
  function setUsedMap(map){ localStorage.setItem(STORAGE_USED, JSON.stringify(map)); }
  function renderHUD(){
    const code = getCodeArr();
    hudCodeEl.textContent = (code.join("").padEnd(4,"_")).split("").join(" ");
  }
  renderHUD();

  // ===== Babylon init
  const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04,0.06,0.12,1);

  const camera = new BABYLON.ArcRotateCamera("cam",
    Math.PI/2, Math.PI/2.5, 40,
    new BABYLON.Vector3(0,2,0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.wheelPrecision = 50;
  canvas.style.touchAction = "none";
  camera.wheelPrecision = 20;     // zoom bằng wheel dễ hơn
  camera.pinchPrecision = 200;    // zoom trên mobile
  camera.minZ = 0.05;
  camera.maxZ = 100000;

  const light = new BABYLON.HemisphericLight("h", new BABYLON.Vector3(0,1,0), scene);
  light.intensity = 1.0;

  // GUI for hotspot buttons (bám theo điểm 3D)
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);

  // Material cho dấu hotspot (nhỏ, khó thấy)
  const hsMat = new BABYLON.StandardMaterial("hsMat", scene);
  hsMat.emissiveColor = new BABYLON.Color3(1, 0.48, 0); // cam
  hsMat.disableLighting = true;
  hsMat.alpha = 0.95;
  hsMat.zOffset = -2;

  // ===== Tool lấy tọa độ: bấm C để bật/tắt, rồi click vào cảnh để log toạ độ
  let capture = false;
  window.addEventListener("keydown", (e)=>{
    if (e.key.toLowerCase() === "c"){
      capture = !capture;
      toast(capture ? "BẬT lấy tọa độ: click vào cảnh" : "TẮT lấy tọa độ");
    }
  });
  scene.onPointerObservable.add((pi)=>{
    if (!capture) return;
    if (pi.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (pick?.hit && pick.pickedPoint){
      console.log("PICKED POINT:", pick.pickedPoint.toString());
      toast("Đã log tọa độ vào Console (F12)");
    }
  });

  // ===== Load GLB
  async function loadGLB(){
    try{
      loadTextEl.textContent = "Đang tải GLB…";
      barEl.style.width = "0%";

      const rootUrl = "./scenes/";
      const fileName = (sceneCfg && sceneCfg.file) ? sceneCfg.file : "tokyo.glb";

      console.log("CITY =", city);
      console.log("sceneCfg =", sceneCfg);
      console.log("Loading =", rootUrl + fileName);

      // onProgress: cập nhật %
      const onProgress = (evt)=>{
        if (!evt.lengthComputable) return;
        const p = Math.round((evt.loaded / evt.total) * 100);
        barEl.style.width = p + "%";
        loadTextEl.textContent = `Đang tải GLB… ${p}%`;
      };

      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "", rootUrl, fileName, scene, onProgress
      );
      result.meshes.forEach(m => m.isPickable = true);

      // Fit camera theo bounding
      const meshes = result.meshes.filter(m => m.getTotalVertices && m.getTotalVertices() > 0);
      if (meshes.length) {
      // ✅ frame tự động toàn bộ mesh
        camera.zoomOn(meshes);
        camera.radius *= 1.25;

      // ✅ góc nhìn đẹp hơn (tránh nhìn ngang mặt đất)
        camera.alpha = Math.PI / 2;
        camera.beta  = 1.15;

      // ✅ chống clip xa/gần
        camera.minZ = 0.05;
        camera.maxZ = camera.radius * 50;

        for (const m of meshes){
          m.computeWorldMatrix(true);
          const b = m.getBoundingInfo().boundingBox;
          const vmin = b.minimumWorld;
          const vmax = b.maximumWorld;
          min = BABYLON.Vector3.Minimize(min, vmin);
          max = BABYLON.Vector3.Maximize(max, vmax);
        }

        const center = min.add(max).scale(0.5);
        const size = max.subtract(min).length();

        camera.setTarget(center);
        camera.radius = Math.max(10, size * 0.8);
        camera.lowerRadiusLimit = camera.radius * 0.25;
        camera.upperRadiusLimit = camera.radius * 2.0;
      }

      barEl.style.width = "100%";
      loadTextEl.textContent = "Tải xong. Kéo để xoay/zoom, bấm hotspot để tìm số!";
      buildHotspots();
    } catch(err){
      console.error(err);
      alert("Lỗi load GLB. Mở F12 > Console gửi mình ảnh là ra bệnh ngay.");
    }
  }

  function handleHotspotClick(h, key, btn){
  const used = getUsedMap();
  if (used[key]) return toast("Hotspot này bạn lấy rồi.");

  if (h.decoy) return toast("Sai rồi 😅");

  used[key] = true;
  setUsedMap(used);
  if (btn) btn.alpha = 0.12;

  const code = getCodeArr();
  if (code.length >= 4) return toast("Bạn đã đủ 4 số. Bấm Submit!");

  code.push(h.rewardDigit);
  setCodeArr(code);
  toast(`✅ Nhận số: ${h.rewardDigit}`);
}

  // ===== Build hotspots
  function buildHotspots(){
  const used = getUsedMap();

  // ✅ Tự scale hotspot theo camera để không bị quá nhỏ
  const markerSize = Math.max(1.5, camera.radius * 0.03);
  const liftY = markerSize * 0.9;
  const px = Math.round(markerSize * 12);

  console.log("HOTSPOTS COUNT:", sceneCfg.hotspots.length, "markerSize:", markerSize);

  sceneCfg.hotspots.forEach(h=>{
    const key = `${city}:${h.id}`;

    // ✅ Marker 3D (luôn thấy vì đủ lớn + được nâng lên)
    const s = BABYLON.MeshBuilder.CreateSphere(`hs_${h.id}`, {diameter: markerSize}, scene);
    s.position = new BABYLON.Vector3(h.pos[0], h.pos[1] + liftY, h.pos[2]);
    s.material = hsMat;
    s.isPickable = true;

    // Click trực tiếp marker 3D
    s.actionManager = new BABYLON.ActionManager(scene);
    s.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnPickTrigger,
      ()=> handleHotspotClick(h, key, null)
    ));

    // ✅ Marker GUI bám theo điểm 3D + hiện chữ hs1/hs2 để bạn test
    const btn = BABYLON.GUI.Button.CreateSimpleButton(`btn_${h.id}`, h.id);
    btn.width = `${px}px`;
    btn.height = `${px}px`;
    btn.thickness = 0;
    btn.color = "#ffb36b";
    btn.fontSize = Math.max(12, Math.round(px * 0.35));
    btn.background = "rgba(255,122,0,0.22)";
    btn.cornerRadius = 999;
    btn.alpha = used[key] ? 0.18 : 1;

    ui.addControl(btn);        // ✅ add trước
    btn.linkWithMesh(s);       // ✅ rồi mới link
    btn.linkOffsetY = -10;

    btn.onPointerClickObservable.add(()=> handleHotspotClick(h, key, btn));
  });

  // ✅ log kiểm tra đã tạo đủ chưa
  console.log("HOTSPOTS CREATED:", scene.meshes.filter(m=>m.name.startsWith("hs_")).length);
}

  // ===== Buttons
  document.getElementById("btnHint").onclick = ()=> alert(sceneCfg.hint);

  document.getElementById("btnClearScene").onclick = ()=>{
    const used = getUsedMap();
    Object.keys(used).filter(k=>k.startsWith(city + ":")).forEach(k=>delete used[k]);
    setUsedMap(used);
    toast("Đã xóa lựa chọn của cảnh này. F5 để hiện lại hotspot.");
  };

  document.getElementById("btnSubmit").onclick = ()=>{
    const code = getCodeArr().join("");
    if (code.length < 4) return alert("Chưa đủ 4 số. Hãy quay lại tìm tiếp!");
    if (code === EXPECTED_CODE) alert("🎉 CHÚC MỪNG! Mã đúng: " + code);
    else alert("❌ Sai rồi. Mã bạn thu là: " + code + "\nBấm Reset ở trang chính để chơi lại.");
  };

  // ===== Render loop
  engine.runRenderLoop(()=> scene.render());
  window.addEventListener("resize", ()=> engine.resize());

  loadGLB();
})();