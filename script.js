(() => {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const safeLoad = (key, fallback) => { try { const v=localStorage.getItem(key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast("Penyimpanan lokal tidak tersedia."); return false; } };
  let toastTimer;
  function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2300); }

  // Navigation
  function showView(name){
    if(name !== "photo" && typeof stopPhotoCamera === "function") stopPhotoCamera();
    $$(".view").forEach(v=>v.classList.toggle("hidden",v.id!==`view-${name}`));
    $$(".tool-card").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
    window.scrollTo({top:0,behavior:"smooth"});
  }
  $$(".tool-card").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  $("#themeBtn").addEventListener("click",()=>{document.body.classList.toggle("light");save("pt_theme",document.body.classList.contains("light")?"light":"dark");});
  if(safeLoad("pt_theme","dark")==="light") document.body.classList.add("light");

  // Honest browser RAM/device information
  function initDeviceInfo(){
    const mem=navigator.deviceMemory;
    $("#heapStatus").textContent=(performance&&performance.memory)?"Tersedia (heap JS)":"Tidak tersedia";
    $("#ramStatus").textContent=Number.isFinite(mem)?`Perkiraan browser: ${mem} GB`:"Data RAM sistem tidak tersedia";
    $("#ramDetail").textContent=Number.isFinite(mem)?"Ini perkiraan kelas memori yang dilaporkan browser, bukan pembacaan RAM bebas.":"Browser ini tidak menyediakan API RAM fisik yang dapat dipercaya.";
    // Keep physical/system values explicitly unavailable: deviceMemory is rounded/coarsened and not total-system telemetry.
    $("#ramTotal").textContent="Tidak tersedia";
    $("#ramUsed").textContent="Tidak tersedia";
    $("#ramFree").textContent="Tidak tersedia";
    $("#heapStatus").textContent=(performance && performance.memory)?"Heap JavaScript tersedia; bukan RAM sistem":"Tidak tersedia";
    $("#screenInfo").textContent=`${screen.width} × ${screen.height}`;
    $("#viewportInfo").textContent=`${window.innerWidth} × ${window.innerHeight}`;
  }
  initDeviceInfo();
  window.addEventListener("resize",()=>{$("#viewportInfo").textContent=`${window.innerWidth} × ${window.innerHeight}`;});

  // RPG progress
  const questDefs=[
    {id:"ram",title:"Inspect the device",desc:"Baca informasi perangkat yang tersedia.",xp:10},
    {id:"calc",title:"Quick calculation",desc:"Gunakan kalkulator untuk satu hitungan.",xp:5},
    {id:"time",title:"Timekeeper",desc:"Selesaikan latihan stopwatch atau timer.",xp:5},
    {id:"qr",title:"Signal rune",desc:"Buat QR Code dari teks atau URL.",xp:5},
    {id:"notes",title:"Field journal",desc:"Simpan catatan pertamamu.",xp:5},
    {id:"convert",title:"Unit alchemy",desc:"Lakukan konversi satuan.",xp:5}
  ];
  let progress=safeLoad("pt_progress",{xp:0,done:{},days:[],unlocked:[]});
  if(!progress||typeof progress!=="object")progress={xp:0,done:{},days:[],unlocked:[]};
  progress.done=progress.done||{}; progress.days=progress.days||[]; progress.unlocked=progress.unlocked||[];
  const today=()=>new Date().toLocaleDateString("en-CA");
  function levelInfo(xp){const level=Math.floor(Math.max(0,xp)/100)+1;return {level,into:Math.max(0,xp)%100};}
  function streak(){
    const days=[...new Set(progress.days||[])].sort().reverse();if(!days.length)return 0;
    const now=new Date();now.setHours(0,0,0,0);
    const todayStr=today();const y=new Date(now);y.setDate(y.getDate()-1);const yesterday=y.toLocaleDateString("en-CA");
    if(days[0]!==todayStr&&days[0]!==yesterday)return 0;
    let count=0, expected=new Date(days[0]+"T00:00:00");
    for(const d of days){const dt=new Date(d+"T00:00:00");if(Math.round((expected-dt)/86400000)===0){count++;expected.setDate(expected.getDate()-1);}else if(dt<expected)break;}
    return count;
  }
  const achDefs=[
    {id:"first",icon:"✦",title:"First Steps",desc:"Selesaikan quest pertama.",test:()=>progress.xp>=5},
    {id:"tool3",icon:"⚒",title:"Tool Explorer",desc:"Selesaikan 3 jenis quest.",test:()=>Object.keys(progress.done).length>=3},
    {id:"xp100",icon:"◈",title:"Rising Adventurer",desc:"Kumpulkan 100 XP.",test:()=>progress.xp>=100},
    {id:"all",icon:"♜",title:"Full Loadout",desc:"Selesaikan semua 6 jenis quest.",test:()=>questDefs.every(q=>Object.keys(progress.done).some(k=>k.startsWith(q.id+"|")))}
  ];
  function refreshRPG(){
    const info=levelInfo(progress.xp);$("#levelNum").textContent=info.level;$("#xpLabel").textContent=`${info.into} / 100 XP`;$("#xpBar").style.width=info.into+"%";
    $("#rankLabel").textContent=info.level>=10?"Legend":info.level>=5?"Veteran":info.level>=3?"Explorer":"Rookie";
    $("#completedCount").textContent=Object.keys(progress.done).length;$("#streakCount").textContent=streak();
    achDefs.forEach(a=>{if(a.test()&&!progress.unlocked.includes(a.id)){progress.unlocked.push(a.id);}});
    $("#achievementCount").textContent=progress.unlocked.length;save("pt_progress",progress);renderQuests();renderAchievements();
  }
  function completeQuest(id){
    const def=questDefs.find(q=>q.id===id);if(!def)return;
    const key=id+"|"+today();
    if(progress.done[key]){toast("Quest ini sudah selesai hari ini.");return;}
    progress.done[key]=true;progress.xp+=def.xp;
    if(!progress.days.includes(today()))progress.days.push(today());
    save("pt_progress",progress);refreshRPG();renderPhotoUsage();toast(`Quest selesai! +${def.xp} XP`);
  }
  function renderQuests(){
    $("#questList").innerHTML="";
    questDefs.forEach(q=>{
      const done=!!progress.done[q.id+"|"+today()];
      const row=document.createElement("div");row.className="quest-item";
      const check=document.createElement("div");check.className="quest-check";check.textContent=done?"✓":"✦";
      const copy=document.createElement("div");copy.className="quest-copy";
      const title=document.createElement("strong");title.textContent=q.title;
      const desc=document.createElement("small");desc.textContent=q.desc+` · +${q.xp} XP`;
      copy.append(title,desc);const btn=document.createElement("button");btn.textContent=done?"Done":"Claim";btn.disabled=done;btn.addEventListener("click",()=>completeQuest(q.id));
      row.append(check,copy,btn);$("#questList").append(row);
    });
  }
  function renderAchievements(){
    $("#achievementList").innerHTML="";
    achDefs.forEach(a=>{const unlocked=progress.unlocked.includes(a.id);const el=document.createElement("div");el.className="achievement"+(unlocked?" unlocked":"");const icon=document.createElement("span");icon.textContent=a.icon;const title=document.createElement("strong");title.textContent=a.title;const desc=document.createElement("small");desc.textContent=unlocked?"Unlocked · "+a.desc:a.desc;el.append(icon,title,desc);$("#achievementList").append(el);});
  }
  $("#ramQuestBtn").addEventListener("click",()=>completeQuest("ram"));
  $$(".quest-action").forEach(b=>b.addEventListener("click",()=>completeQuest(b.dataset.quest)));
  $("#resetProgress").addEventListener("click",()=>{if(confirm("Reset XP, quest, dan achievement? Catatan dan alat lain tidak akan dihapus.")){progress={xp:0,done:{},days:[],unlocked:[]};save("pt_progress",progress);refreshRPG();renderPhotoUsage();toast("Progress RPG direset.");}});
  refreshRPG();

  // Calculator: safe arithmetic parser, no eval
  let calcExpr="",calcJustEvaluated=false;
  function renderCalc(){ $("#calcOutput").textContent=calcExpr||"0"; }
  function evaluateExpression(expr){
    const tokens=expr.match(/(?:\d+\.?\d*|\.\d+)|[+\-*/()%]/g);
    if(!tokens||tokens.join("")!==expr.replace(/\s/g,""))throw Error("invalid");
    let pos=0;
    function primary(){let t=tokens[pos++];if(t===undefined)throw Error("missing");
      if(t==="+")return primary();if(t==="-")return -primary();
      if(t==="("){const v=addSub();if(tokens[pos++]!==")")throw Error("paren");return v;}
      if(t==="%")throw Error("percent");
      const n=Number(t);if(!Number.isFinite(n))throw Error("number");return n;}
    function mulDiv(){let v=primary();while(["*","/","%"].includes(tokens[pos])){const op=tokens[pos++],r=primary();if((op==="/"||op==="%")&&r===0)throw Error("zero");v=op==="*"?v*r:op==="/"?v/r:v%r;}return v;}
    function addSub(){let v=mulDiv();while(tokens[pos]==="+"||tokens[pos]==="-"){const op=tokens[pos++],r=mulDiv();v=op==="+"?v+r:v-r;}return v;}
    const result=addSub();if(pos!==tokens.length||!Number.isFinite(result))throw Error("invalid");return result;
  }
  $$(".calc-grid button").forEach(b=>b.addEventListener("click",()=>{
    const v=b.dataset.calc;
    if(v==="clear"){calcExpr="";$("#calcHistory").textContent="";calcJustEvaluated=false;}
    else if(v==="back"){calcExpr=calcExpr.slice(0,-1);calcJustEvaluated=false;}
    else if(v==="sign"){if(calcExpr.startsWith("-"))calcExpr=calcExpr.slice(1);else if(calcExpr)calcExpr="-("+calcExpr+")";calcJustEvaluated=false;}
    else if(v==="="){try{const result=evaluateExpression(calcExpr);$("#calcHistory").textContent=calcExpr+" =";calcExpr=String(Number(result.toPrecision(12)));calcJustEvaluated=true;completeQuest("calc");}catch{$("#calcHistory").textContent="Input tidak valid";}}
    else if(v==="%"){try{const result=evaluateExpression(calcExpr)/100;calcExpr=String(result);calcJustEvaluated=false;}catch{toast("Masukkan angka yang valid dahulu.");}}
    else{if(calcJustEvaluated&&/[0-9.]/.test(v))calcExpr="";calcJustEvaluated=false;calcExpr+=v;}
    renderCalc();
  }));

  // Stopwatch uses monotonic time and corrects display after backgrounding
  let swRunning=false,swStartAt=0,swElapsed=0,swFrame=null,laps=[];
  const fmtStop=ms=>{const c=Math.floor(ms/10),cs=c%100,s=Math.floor(c/100)%60,m=Math.floor(c/6000);return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;};
  function paintSW(){const elapsed=swElapsed+(swRunning?performance.now()-swStartAt:0);$("#stopwatchDisplay").textContent=fmtStop(elapsed);if(swRunning)swFrame=requestAnimationFrame(paintSW);}
  $("#swStart").addEventListener("click",()=>{if(swRunning){swElapsed+=performance.now()-swStartAt;swRunning=false;cancelAnimationFrame(swFrame);$("#swStart").textContent="▶ Lanjut";}else{swStartAt=performance.now();swRunning=true;$("#swStart").textContent="Ⅱ Jeda";paintSW();}});
  $("#swLap").addEventListener("click",()=>{if(!swRunning&&swElapsed===0)return;laps.unshift(fmtStop(swElapsed+(swRunning?performance.now()-swStartAt:0)));$("#lapList").innerHTML="";laps.slice(0,10).forEach((lap,i)=>{const li=document.createElement("li");li.textContent=`Lap ${laps.length-i}: ${lap}`;$("#lapList").append(li);});});
  $("#swReset").addEventListener("click",()=>{swRunning=false;swElapsed=0;laps=[];cancelAnimationFrame(swFrame);$("#swStart").textContent="▶ Start";$("#stopwatchDisplay").textContent="00:00.00";$("#lapList").innerHTML="";});

  // Timer counts against a deadline; page must remain open for reliable alerting
  let timerRunning=false,timerEnd=0,timerInterval=null;
  function timerRemaining(){return Math.max(0,timerEnd-Date.now());}
  function fmtTimer(ms){const total=Math.ceil(ms/1000);return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;}
  function updateTimer(){const rem=timerRemaining();$("#timerDisplay").textContent=fmtTimer(rem);if(rem<=0&&timerRunning){timerRunning=false;clearInterval(timerInterval);$("#timerStart").textContent="▶ Mulai timer";$("#timerMessage").textContent="Timer selesai!";toast("Timer selesai.");try{if(navigator.vibrate)navigator.vibrate([150,80,150]);}catch{}}}
  $("#timerStart").addEventListener("click",()=>{if(timerRunning){timerRunning=false;clearInterval(timerInterval);$("#timerStart").textContent="▶ Lanjut";$("#timerMessage").textContent="Timer dijeda.";return;}
    if($("#timerDisplay").textContent==="00:00"||$("#timerStart").textContent==="▶ Mulai timer"){const mins=Math.max(0,Math.min(999,Number($("#timerMinutes").value)||0)),secs=Math.max(0,Math.min(59,Number($("#timerSeconds").value)||0));const total=(mins*60+secs)*1000;if(total<=0){toast("Atur durasi lebih dari 0 detik.");return;}timerEnd=Date.now()+total;}
    else timerEnd=Date.now()+Math.max(0,Number($("#timerPauseRemaining")?.value||0));
    // On resume, remaining time is held in a closure variable.
    timerRunning=true;$("#timerStart").textContent="Ⅱ Jeda";$("#timerMessage").textContent="Timer berjalan. Tetap buka halaman.";clearInterval(timerInterval);timerInterval=setInterval(updateTimer,200);updateTimer();
  });
  let pausedTimerMs=0;
  // Override timer handler with explicit paused state for reliable resume.
  $("#timerStart").onclick=null;
  $("#timerStart").addEventListener("click",()=>{});
  const timerBtn=$("#timerStart");
  timerBtn.replaceWith(timerBtn.cloneNode(true));
  const timerStartBtn=$("#timerStart");
  timerStartBtn.addEventListener("click",()=>{
    if(timerRunning){pausedTimerMs=timerRemaining();timerRunning=false;clearInterval(timerInterval);timerStartBtn.textContent="▶ Lanjut";$("#timerMessage").textContent="Timer dijeda.";return;}
    if(pausedTimerMs>0){timerEnd=Date.now()+pausedTimerMs;pausedTimerMs=0;}
    else {const mins=Math.max(0,Math.min(999,Number($("#timerMinutes").value)||0)),secs=Math.max(0,Math.min(59,Number($("#timerSeconds").value)||0));const total=(mins*60+secs)*1000;if(total<=0){toast("Atur durasi lebih dari 0 detik.");return;}timerEnd=Date.now()+total;}
    timerRunning=true;timerStartBtn.textContent="Ⅱ Jeda";$("#timerMessage").textContent="Timer berjalan. Tetap buka halaman.";clearInterval(timerInterval);timerInterval=setInterval(updateTimer,200);updateTimer();
  });
  $("#timerReset").addEventListener("click",()=>{timerRunning=false;pausedTimerMs=0;clearInterval(timerInterval);timerStartBtn.textContent="▶ Mulai timer";$("#timerMinutes").value=1;$("#timerSeconds").value=0;$("#timerDisplay").textContent="01:00";$("#timerMessage").textContent="Biarkan halaman tetap terbuka agar timer berjalan lebih konsisten.";});
  $$("[data-time-mode]").forEach(b=>b.addEventListener("click",()=>{const timer=b.dataset.timeMode==="timer";$$("[data-time-mode]").forEach(x=>x.classList.toggle("selected",x===b));$("#timerPane").classList.toggle("hidden",!timer);$("#stopwatchPane").classList.toggle("hidden",timer);}));

  // QR generation through external service: explicitly requires internet.
  $("#qrGenerate").addEventListener("click",()=>{
    const value=$("#qrInput").value.trim();if(!value){toast("Masukkan teks atau URL dahulu.");return;}
    if(value.length>1800){toast("Teks terlalu panjang untuk QR ini.");return;}
    const url="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="+encodeURIComponent(value);
    $("#qrImage").src=url;$("#qrOpen").href=url;$("#qrCaption").textContent=value;$("#qrOutput").classList.remove("hidden");
    $("#qrImage").onerror=()=>toast("QR gagal dimuat. Periksa koneksi internet.");
    $("#qrImage").onload=()=>{completeQuest("qr");};
  });

  // Notes CRUD with textContent (avoid injecting user HTML)
  let notes=safeLoad("pt_notes",[]),editingId=null;
  if(!Array.isArray(notes))notes=[];
  function renderNotes(){
    const host=$("#notesList");host.innerHTML="";
    if(!notes.length){const p=document.createElement("p");p.className="muted tiny";p.textContent="Belum ada catatan. Simpan ide pertamamu di sini.";host.append(p);return;}
    notes.slice().sort((a,b)=>b.updated-a.updated).forEach(n=>{
      const card=document.createElement("article");card.className="note-card";const h=document.createElement("h3");h.textContent=n.title||"Tanpa judul";const p=document.createElement("p");p.textContent=n.body;const time=document.createElement("small");time.className="muted tiny";time.textContent=new Date(n.updated).toLocaleString();const actions=document.createElement("div");actions.className="note-actions";const edit=document.createElement("button");edit.textContent="Edit";edit.addEventListener("click",()=>{editingId=n.id;$("#noteTitle").value=n.title;$("#noteBody").value=n.body;$("#saveNote").textContent="Simpan perubahan";$("#cancelNote").classList.remove("hidden");$("#noteTitle").focus();});const del=document.createElement("button");del.textContent="Hapus";del.className="delete-note";del.addEventListener("click",()=>{if(confirm("Hapus catatan ini?")){notes=notes.filter(x=>x.id!==n.id);save("pt_notes",notes);renderNotes();if(editingId===n.id)resetNoteForm();}});actions.append(edit,del);card.append(h,p,time,actions);host.append(card);
    });
  }
  function resetNoteForm(){editingId=null;$("#noteTitle").value="";$("#noteBody").value="";$("#saveNote").textContent="Simpan catatan";$("#cancelNote").classList.add("hidden");}
  $("#saveNote").addEventListener("click",()=>{const title=$("#noteTitle").value.trim(),body=$("#noteBody").value.trim();if(!title&&!body){toast("Isi judul atau catatan dahulu.");return;}if(editingId){const n=notes.find(x=>x.id===editingId);if(n){n.title=title;n.body=body;n.updated=Date.now();}}else notes.push({id:String(Date.now())+Math.random().toString(16).slice(2),title,body,updated:Date.now()});if(save("pt_notes",notes)){renderNotes();resetNoteForm();completeQuest("notes");toast("Catatan tersimpan.");}});
  $("#cancelNote").addEventListener("click",resetNoteForm);renderNotes();


  // Photobooth: camera preview + client-side canvas filters + daily usage limit.
  const PHOTO_BASE_LIMIT = 10;
  const PHOTO_BONUS_PACK = 5;
  const PHOTO_BONUS_COST = 50;
  const photoFilterMap = {
    normal: "none",
    mono: "grayscale(1)",
    warm: "sepia(.38) saturate(1.25)",
    cool: "saturate(.85) hue-rotate(15deg)",
    retro: "sepia(.55) contrast(1.08) saturate(.8)",
    dream: "brightness(1.08) saturate(1.25) contrast(.92)"
  };
  let photoStream = null;
  let photoFacing = "user";
  let photoFilter = "normal";
  let photoUsage = loadPhotoUsage();

  function photoTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function loadPhotoUsage() {
    const saved = safeLoad("pt_photo_usage", null);
    if (!saved || saved.date !== photoTodayKey()) return {date:photoTodayKey(), used:0, bonus:0};
    return {date:saved.date, used:Math.max(0,Number(saved.used)||0), bonus:Math.max(0,Number(saved.bonus)||0)};
  }
  function photoLimit() { return PHOTO_BASE_LIMIT + photoUsage.bonus; }
  function savePhotoUsage() { save("pt_photo_usage", photoUsage); renderPhotoUsage(); }
  function renderPhotoUsage() {
    const limit = photoLimit();
    const used = Math.min(photoUsage.used, limit);
    $("#photoUsage").textContent = `${used} / ${limit}`;
    $("#photoUsageBar").style.width = `${Math.min(100, used/Math.max(1,limit)*100)}%`;
    $("#photoLimitMessage").textContent = used >= limit
      ? `Limit hari ini habis. Coba lagi besok atau tukar ${PHOTO_BONUS_COST} XP untuk +${PHOTO_BONUS_PACK} jepretan.`
      : `Sisa ${limit-used} jepretan hari ini.`;
    $("#photoCapture").disabled = !photoStream || used >= limit;
    $("#photoBuyMore").disabled = progress.xp < PHOTO_BONUS_COST;
    $("#photoBuyMore").textContent = progress.xp >= PHOTO_BONUS_COST
      ? `Tukar ${PHOTO_BONUS_COST} XP → +${PHOTO_BONUS_PACK} jepretan`
      : `Butuh ${PHOTO_BONUS_COST} XP untuk +${PHOTO_BONUS_PACK} jepretan`;
  }
  function stopPhotoCamera() {
    if (photoStream) {
      photoStream.getTracks().forEach(track => track.stop());
      photoStream = null;
    }
    const video = $("#photoVideo");
    if (video) video.srcObject = null;
    const placeholder = $("#photoPlaceholder");
    if (placeholder) placeholder.classList.remove("hidden");
    if ($("#photoStart")) $("#photoStart").disabled = false;
    if ($("#photoFlip")) $("#photoFlip").disabled = true;
    if ($("#photoStop")) $("#photoStop").disabled = true;
    if ($("#photoCapture")) $("#photoCapture").disabled = true;
  }
  async function startPhotoCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Browser ini tidak mendukung akses kamera. Coba browser terbaru.");
      return;
    }
    stopPhotoCamera();
    try {
      photoStream = await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{facingMode:{ideal:photoFacing},width:{ideal:1280},height:{ideal:960}}
      });
      const video = $("#photoVideo");
      video.srcObject = photoStream;
      await video.play();
      $("#photoPlaceholder").classList.add("hidden");
      $("#photoStart").disabled = true;
      $("#photoFlip").disabled = false;
      $("#photoStop").disabled = false;
      renderPhotoUsage();
      toast("Kamera aktif. Siap mengambil foto.");
    } catch (err) {
      stopPhotoCamera();
      const msg = err && err.name === "NotAllowedError"
        ? "Izin kamera ditolak. Izinkan kamera lewat pengaturan browser."
        : err && err.name === "NotFoundError"
          ? "Kamera tidak ditemukan pada perangkat ini."
          : "Kamera gagal dibuka. Pastikan situs memakai HTTPS dan tidak dipakai aplikasi lain.";
      toast(msg);
    }
  }
  $("#photoStart").addEventListener("click", startPhotoCamera);
  $("#photoStop").addEventListener("click", () => { stopPhotoCamera(); toast("Kamera dimatikan."); });
  $("#photoFlip").addEventListener("click", async () => {
    photoFacing = photoFacing === "user" ? "environment" : "user";
    await startPhotoCamera();
  });
  $$("#photoFilters [data-filter]").forEach(btn => btn.addEventListener("click", () => {
    photoFilter = btn.dataset.filter;
    $$("#photoFilters [data-filter]").forEach(b => b.classList.toggle("selected", b === btn));
    $("#photoVideo").style.setProperty("--photo-filter", photoFilterMap[photoFilter]);
    $("#photoVideo").style.filter = photoFilterMap[photoFilter];
  }));
  $("#photoBuyMore").addEventListener("click", () => {
    if (progress.xp < PHOTO_BONUS_COST) {
      toast(`XP belum cukup. Butuh ${PHOTO_BONUS_COST} XP.`);
      return;
    }
    if (!confirm(`Tukar ${PHOTO_BONUS_COST} XP untuk ${PHOTO_BONUS_PACK} jepretan tambahan hari ini?`)) return;
    progress.xp -= PHOTO_BONUS_COST;
    photoUsage.bonus += PHOTO_BONUS_PACK;
    save("pt_progress", progress);
    refreshRPG();
    savePhotoUsage();
    toast(`Limit bertambah ${PHOTO_BONUS_PACK} jepretan!`);
  });
  $("#photoCapture").addEventListener("click", () => {
    photoUsage = loadPhotoUsage();
    if (photoUsage.used >= photoLimit()) {
      renderPhotoUsage();
      toast("Limit 10 jepretan hari ini sudah habis.");
      return;
    }
    const video = $("#photoVideo");
    if (!photoStream || !video.videoWidth || !video.videoHeight) {
      toast("Aktifkan kamera dan tunggu pratinjau muncul dahulu.");
      return;
    }
    const canvas = $("#photoCanvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = photoFilterMap[photoFilter] || "none";
    // Mirror the front-facing camera preview in the saved image for a familiar selfie view.
    if (photoFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.filter = "none";
    canvas.toBlob(blob => {
      if (!blob) { toast("Foto gagal diproses. Coba lagi."); return; }
      photoUsage.used += 1;
      savePhotoUsage();
      const url = URL.createObjectURL(blob);
      const result = $("#photoResultImage");
      const oldUrl = result.dataset.objectUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      result.dataset.objectUrl = url;
      result.src = url;
      $("#photoDownload").href = url;
      $("#photoResult").classList.remove("hidden");
      toast(`Foto tersimpan sebagai pratinjau. Sisa ${Math.max(0,photoLimit()-photoUsage.used)} jepretan.`);
    }, "image/png");
  });
  $("#photoClear").addEventListener("click", () => {
    const result = $("#photoResultImage");
    if (result.dataset.objectUrl) URL.revokeObjectURL(result.dataset.objectUrl);
    result.removeAttribute("src");
    delete result.dataset.objectUrl;
    $("#photoResult").classList.add("hidden");
  });
  renderPhotoUsage();

  // Unit conversion
  const units={
    length:{label:"Panjang",units:{m:1,km:1000,cm:.01,mm:.001,mi:1609.344,ft:.3048,in:.0254}},
    weight:{label:"Berat",units:{kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125}},
    data:{label:"Kapasitas data",units:{"B":1,"KB (desimal)":1000,"MB (desimal)":1e6,"GB (desimal)":1e9,"KiB (biner)":1024,"MiB (biner)":1048576,"GiB (biner)":1073741824}},
    temperature:{label:"Suhu",units:{C:"C",F:"F",K:"K"}}
  };
  function convertTemperature(v,from,to){let c=from==="C"?v:from==="F"?(v-32)*5/9:v-273.15;return to==="C"?c:to==="F"?c*9/5+32:c+273.15;}
  function populateUnits(){
    const cat=$("#convertCategory").value,keys=Object.keys(units[cat].units);
    ["#convertFrom","#convertTo"].forEach(sel=>{const el=$(sel),old=el.value;el.innerHTML="";keys.forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;el.append(o);});if(keys.includes(old))el.value=old;});
    $("#convertFrom").value=keys[0];$("#convertTo").value=keys[1]||keys[0];runConvert();
  }
  function runConvert(){
    const cat=$("#convertCategory").value,v=Number($("#convertValue").value),from=$("#convertFrom").value,to=$("#convertTo").value;
    if($("#convertValue").value.trim()===""||!Number.isFinite(v)){$("#convertOutput").textContent="Masukkan nilai yang valid";return;}
    let result;if(cat==="temperature")result=convertTemperature(v,from,to);else result=v*units[cat].units[from]/units[cat].units[to];
    $("#convertOutput").textContent=Number(result.toPrecision(10)).toLocaleString("id-ID",{maximumFractionDigits:8});
    if(from!==to){} 
  }
  $("#convertCategory").addEventListener("change",populateUnits);
  ["#convertValue","#convertFrom","#convertTo"].forEach(s=>$(s).addEventListener("input",runConvert));
  populateUnits();
  $("#convertValue").addEventListener("change",()=>{if($("#convertValue").value!=="")completeQuest("convert");});
})();
