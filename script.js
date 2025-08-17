// this is the Code Of The website you should not edit this!!!!

(function(){
  const form = document.getElementById('form');
  const input = document.getElementById('name');
  const checkBtn = document.getElementById('checkBtn');
  const statusEl = document.getElementById('status');
  const detailsEl = document.getElementById('details');
  const stateIcon = document.getElementById('stateIcon');
  const panel = document.getElementById('resultPanel');

  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const skinPreview = document.getElementById('skinPreview');
  const uuidLine = document.getElementById('uuidLine');
  const capeGrid = document.getElementById('capeGrid');

  const reValid = /^[A-Za-z0-9_]{3,16}$/;
  let badWords = [];
  let lastCheck = 0;
  const cooldown = 3000;
// DONT USE THIS!
  const PROXY = "https://mcchecker.crystalpvp2023.workers.dev/";

  function setLoading(isLoading) {
    stateIcon.style.display = isLoading ? 'inline-block' : 'none';
    checkBtn.disabled = isLoading;
  }

  function setStatus(kind, title, details) {
    statusEl.textContent = title;
    detailsEl.textContent = details || '';
    panel.classList.remove('ok','bad','warn');
    statusEl.classList.remove('muted');

    const classMap = { ok: 'ok', bad: 'bad', warn: 'warn' };
    if (kind && classMap[kind]) {
      panel.classList.add(classMap[kind]);
    } else {
      statusEl.classList.add('muted');
    }
  }


  async function proxyFetch(target, opts={}) {
    const url = PROXY + encodeURIComponent(target);
    const r = await fetch(url, { ...opts, cache:"no-store" });
    return r;
  }

  async function fetchBadWords(){
    try {
      const r = await proxyFetch("https://www.cs.cmu.edu/~biglou/resources/bad-words.txt");
      if (!r.ok) throw new Error('Failed to load bad words list');
      const txt = await r.text();
      badWords = txt.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean);
    } catch(e) {
      console.error('❌ Could not load profanity list:', e);
      badWords = [];
    }
  }

 
  async function checkUsername(name){
    const url = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`;
    const resp = await proxyFetch(url);
    if (resp.status === 204 || resp.status === 404) return { exists:false };
    if (resp.status === 200) {
      const data = await resp.json().catch(()=>null);
      if (data && data.id) return { exists:true, data };
      return { exists:false };
    }
    if (!resp.ok) throw new Error(`Mojang API error (HTTP ${resp.status})`);
    return { exists:false };
  }


  async function fetchTextures(uuid){
    const url = `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`;
    const r = await proxyFetch(url);
    if (!r.ok) throw new Error('session server error');
    const data = await r.json();
    const prop = (data.properties||[]).find(p=>p.name==='textures');
    if(!prop || !prop.value) return {};
    const decoded = JSON.parse(atob(prop.value));
    return decoded.textures || {};
  }

  function renderCapes(urls){
    capeGrid.innerHTML = '';
    if (!urls || !urls.length){
      capeGrid.innerHTML = '<div class="muted">No Capes Found! (Experimental Feature)! :c</div>';
      return;
    }
    urls.forEach(u=>{
      const img = document.createElement('img');
      img.src = u; img.alt = 'Cape';
      capeGrid.appendChild(img);
    });
  }

  async function performCheck(){
    const now = Date.now();
    if(now - lastCheck < cooldown){
      const wait = Math.ceil((cooldown - (now - lastCheck))/1000);
      setStatus('warn', 'Slow down!', `Please wait ${wait}s before checking again.`);
      return;
    }
    lastCheck = now;

    const raw = input.value.trim();
    if(!raw){
      setStatus('', 'Enter a username to check availability.', 'Waiting for you to submit a name…');
      return;
    }
    if(!reValid.test(raw)){
      setStatus('bad','Invalid username format.','Use 3–16 characters: A–Z, 0–9 or _.');
      return;
    }

    const lowered = raw.toLowerCase();
    if(badWords.length && badWords.some(w => lowered.includes(w))){
      setStatus('bad', 'That username contains a profane word.', 'Try a different one.');
      return;
    }

    try{
      setLoading(true);
      setStatus('', 'Checking Mojang…','Contacting the Mojang API via proxy.');
      const res = await checkUsername(raw);

      if(res.exists){
        setStatus('bad', `“${res.data?.name || raw}” is NOT available.`, 'Currently taken.');
        sidebar.classList.add('open');

        skinPreview.innerHTML = '<div class="muted">Skin Loading…</div>';
        const skinUrl = `https://mineskin.eu/armor/body/${encodeURIComponent(res.data.name || raw)}/700.png`;
        skinPreview.innerHTML = `<img class="skin-img" src="${skinUrl}" alt="${raw}'s skin" />`;
        uuidLine.textContent = `UUID: ${res.data.id || res.data.uuid || '(unknown)'}`;

        try{
          const textures = await fetchTextures(res.data.id || res.data.uuid);
          const capes = [];
          if (textures.CAPE && textures.CAPE.url) capes.push(textures.CAPE.url);
          if (Array.isArray(textures.capes)) textures.capes.forEach(c=>{ if(c&&c.url) capes.push(c.url); });
          renderCapes(capes);
        }catch(err){ console.warn('cape fetch failed', err); renderCapes([]); }
      } else {
        setStatus('ok', `“${raw}” looks available.`, 'No profile found. Still may be locked or filtered.');
        sidebar.classList.remove('open');
        skinPreview.innerHTML = ''; uuidLine.textContent=''; capeGrid.innerHTML='';
      }
    }catch(err){
      console.error(err);
      setStatus('bad','Could not check right now.','Mojang may be rate-limiting or down; try again soon.');
    }finally{ setLoading(false); }
  }

  form.addEventListener('submit', e=>{ e.preventDefault(); performCheck(); });
  document.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{ input.value = chip.dataset.example; form.requestSubmit(); });
  });
  closeSidebar.addEventListener('click', ()=> sidebar.classList.remove('open'));

  fetchBadWords();
})();
