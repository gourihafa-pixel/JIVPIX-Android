
// JIVPIX Android bridge (safe fallback for normal browser/PWA)
window.JIVPIXAndroid = window.JIVPIXAndroid || null;

function jivpixNativeNetworkStatus() {
  try {
    if (window.JIVPIXAndroid && typeof window.JIVPIXAndroid.getNetworkStatus === "function") {
      return JSON.parse(window.JIVPIXAndroid.getNetworkStatus());
    }
  } catch (_) {}
  return null;
}

const SUPABASE_URL = "https://syztriuqrcuszqskbcce.supabase.co";
const SUPABASE_KEY = "sb_publishable_aqCk2HYU08HNh6_Xb9QRDw_Q2pgGzYU";

const supabaseReady = SUPABASE_URL.startsWith("http") && !SUPABASE_KEY.startsWith("PASTE_");
const sb = supabaseReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const demoServers = [
  {id:1,country:"Allemagne",city:"Frankfurt",flag:"🇩🇪",ping:42,active:true},
  {id:2,country:"France",city:"Paris",flag:"🇫🇷",ping:48,active:true},
  {id:3,country:"Pays-Bas",city:"Amsterdam",flag:"🇳🇱",ping:51,active:true},
  {id:4,country:"Royaume-Uni",city:"London",flag:"🇬🇧",ping:63,active:true},
  {id:5,country:"États-Unis",city:"New York",flag:"🇺🇸",ping:112,active:true},
  {id:6,country:"Singapour",city:"Singapore",flag:"🇸🇬",ping:190,active:true}
];

let state = {
  page:"home",
  connected:false,
  selectedServer: JSON.parse(localStorage.getItem("jivpix_server") || "null") || demoServers[0],
  servers: demoServers,
  session:null,
  profile:null,
  settings:{dns_protection:false,tracker_blocker:false,wifi_security:false}
};

function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
function saveServer(){localStorage.setItem("jivpix_server",JSON.stringify(state.selectedServer))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function loadData(){
  if(!sb) return;
  const {data:{session}} = await sb.auth.getSession();
  state.session=session;
  if(session){
    const p=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
    if(p.data) state.profile=p.data;
    const s=await sb.from("user_settings").select("*").eq("user_id",session.user.id).maybeSingle();
    if(s.data) state.settings={...state.settings,...s.data};
    const sv=await sb.from("servers").select("*").eq("active",true).order("id");
    if(sv.data?.length) state.servers=sv.data;
  }
}

async function saveSettings(){
  if(!sb || !state.session) return;
  await sb.from("user_settings").upsert({
    user_id:state.session.user.id,
    ...state.settings,
    selected_server_id:state.selectedServer?.id || null,
    updated_at:new Date().toISOString()
  });
}

function render(){
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===state.page));
  const v=document.getElementById("view");
  if(state.page==="home") v.innerHTML=homePage();
  if(state.page==="servers") v.innerHTML=serversPage();
  if(state.page==="security") v.innerHTML=securityPage();
  if(state.page==="settings") v.innerHTML=settingsPage();
  bind();
}

function homePage(){
  return `<section class="page">
    <div class="hero">
      <div class="status">${state.connected?"متصل":"غير متصل"}</div>
      <div class="server-name">${esc(state.selectedServer.flag)} ${esc(state.selectedServer.city || state.selectedServer.country)}</div>
      <button id="power" class="power ${state.connected?"connected":""}" aria-label="${state.connected?"فصل الاتصال":"الاتصال"}">
  <span class="power-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 7v25"/><path d="M19 13a25 25 0 1 0 26 0"/></svg></span>
</button>
      <div class="muted">${state.connected?"JIVPIX VPN يعمل":"اضغط للاتصال"}</div>
    </div>
    <div class="grid">
      <div class="card feature"><b><span class="mini-icon">DNS</span> DNS Protection</b><span class="muted">${state.settings.dns_protection?"مفعّل":"غير مفعّل"}</span></div>
      <div class="card feature"><b><span class="mini-icon">TB</span> Tracker Blocker</b><span class="muted">${state.settings.tracker_blocker?"مفعّل":"غير مفعّل"}</span></div>
      <div class="card feature"><b><span class="mini-icon">Wi</span> Wi‑Fi Security</b><span class="muted">${state.settings.wifi_security?"مفعّل":"غير مفعّل"}</span></div>
      <div class="card feature"><b><span class="mini-icon">★</span> الخطة</b><span class="muted">${state.profile?.plan==="premium"?"Premium":"Free"}</span></div>
    </div>
    <div class="card row"><div><b>السيرفر الحالي</b><div class="muted">${esc(state.selectedServer.country)} • ${state.selectedServer.ping||"—"} ms</div></div><button class="btn secondary" id="chooseServer">تغيير</button></div>
  </section>`;
}

function serversPage(){
  return `<section class="page">
    <div class="section-title">السيرفرات</div>
    <input id="serverSearch" class="search" placeholder="ابحث عن دولة أو مدينة">
    <div id="serverList">${serverList(state.servers)}</div>
  </section>`;
}
function serverList(list){
  if(!list.length) return `<div class="card muted">لا توجد نتائج</div>`;
  return list.map(s=>`<div class="card server ${state.selectedServer.id==s.id?"selected":""}" data-server="${s.id}">
    <div class="row"><div><span class="flag">${esc(s.flag||"🌐")}</span> <b>${esc(s.city||"")}</b><div class="muted">${esc(s.country)}</div></div><div class="gold">${s.ping??"—"} ms</div></div>
  </div>`).join("");
}

function securityPage(){
  const item=(key,title,desc)=>`<div class="card row"><div><b>${title}</b><div class="muted">${desc}</div></div><button class="switch ${state.settings[key]?"on":""}" data-toggle="${key}"></button></div>`;
  return `<section class="page"><div class="section-title">الحماية</div>
    ${item("dns_protection","DNS Protection","حماية طلبات DNS")}
    ${item("tracker_blocker","Tracker Blocker","تقليل التتبع والإعلانات المزعجة")}
    ${item("wifi_security","Wi‑Fi Security","فحص أمان شبكة Wi‑Fi")}
    <div class="card"><b>ملاحظة</b><p class="muted">هذه النسخة تربط إعدادات الحماية بالحساب. تشغيل VPN الحقيقي يحتاج دمج VpnService مع مزود VPN في مرحلة لاحقة.</p></div>
  </section>`;
}

function settingsPage(){
  const email=state.session?.user?.email || "غير مسجل";
  return `<section class="page"><div class="section-title">الإعدادات</div>
    <div class="card"><div class="muted">الحساب</div><b>${esc(email)}</b><div class="muted">الخطة: ${state.profile?.plan==="premium"?"Premium ⭐":"Free"}</div></div>
    ${!state.session?`<div class="card"><b>ربط الحساب</b><p class="muted">بعد وضع بيانات Supabase، يمكنك تسجيل الدخول من هنا.</p><button class="btn" id="loginBtn">تسجيل الدخول / إنشاء حساب</button></div>`:`<div class="card"><button class="btn secondary" id="logoutBtn">تسجيل الخروج</button></div>`}
    <div class="card"><b>JIVPIX v4</b><p class="muted">واجهة Supabase جاهزة. لا تضع Service Role Key داخل التطبيق.</p></div>
  </section>`;
}

function bind(){
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});
  document.getElementById("power")?.addEventListener("click",()=>{
    state.connected=!state.connected;
    toast(state.connected?"تم الاتصال (واجهة تجريبية)":"تم الفصل");
    render();
  });
  document.getElementById("chooseServer")?.addEventListener("click",()=>{state.page="servers";render()});
  document.getElementById("serverSearch")?.addEventListener("input",e=>{
    const q=e.target.value.toLowerCase();
    document.getElementById("serverList").innerHTML=serverList(state.servers.filter(s=>(s.country+" "+(s.city||"")).toLowerCase().includes(q)));
    bindServers();
  });
  bindServers();
  document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=async()=>{
    const k=b.dataset.toggle;state.settings[k]=!state.settings[k];await saveSettings();render();
  });
  document.getElementById("loginBtn")?.addEventListener("click",loginModal);
  document.getElementById("logoutBtn")?.addEventListener("click",async()=>{if(sb) await sb.auth.signOut();state.session=null;state.profile=null;render();toast("تم تسجيل الخروج")});
  document.getElementById("accountBtn")?.addEventListener("click",()=>{state.page="settings";render()});
}
function bindServers(){
  document.querySelectorAll("[data-server]").forEach(el=>el.onclick=async()=>{
    const s=state.servers.find(x=>String(x.id)===String(el.dataset.server));
    if(s){state.selectedServer=s;saveServer();await saveSettings();state.page="home";render();toast("تم اختيار السيرفر")}
  });
}

async function loginModal(){
  if(!sb){toast("ضع بيانات Supabase أولاً في app.js");return}
  const email=prompt("البريد الإلكتروني:");
  if(!email)return;
  const password=prompt("كلمة المرور (6 أحرف أو أكثر):");
  if(!password)return;
  let r=await sb.auth.signInWithPassword({email,password});
  if(r.error){
    const c=await sb.auth.signUp({email,password});
    if(c.error){toast(c.error.message);return}
    r={data:c.data};
    toast("تم إنشاء الحساب. تحقق من البريد إذا طلب Supabase ذلك.");
  }
  state.session=r.data.session;
  await loadData();render();
}

(async()=>{await loadData();render()})();