
// Elements
const app = document.getElementById('app');
const input = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locBtn = document.getElementById('locBtn');
const statusEl = document.getElementById('status');
const sugg = document.getElementById('suggestions');
const mode = document.getElementById('mode');
// Clock card
const cityTitle = document.getElementById('cityTitle');
const timeNow = document.getElementById('timeNow');
const dateNow = document.getElementById('dateNow');
// Current card fields
const tempNow = document.getElementById('tempNow');
const feelsLike = document.getElementById('feelsLike');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const hum = document.getElementById('hum');
const wind = document.getElementById('wind');
const press = document.getElementById('press');
const vis = document.getElementById('vis');
const desc = document.getElementById('desc');
const strip5 = document.getElementById('forecastStrip');
const hourlyStrip = document.getElementById('hourlyStrip');
// API
const apiKey = `3acdda1521924e7fa6ec818d3eff2093`;

const W_NOW = (q)=>`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${apiKey}&units=metric`;
const W_FORE = (q)=>`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(q)}&appid=${apiKey}&units=metric`;

function say(msg, isErr=false, timeout=2400){
  if (!msg){ statusEl.classList.remove('show','error'); return; }
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', !!isErr);
  statusEl.classList.remove('show'); void statusEl.offsetWidth; // restart anim
  statusEl.classList.add('show');
  clearTimeout(say._t); say._t = setTimeout(()=> statusEl.classList.remove('show'), timeout);
}

// CSV suggestions
let cityList = [];
let csvLoaded = false;

async function loadCitiesCsv(){
    if (csvLoaded) return cityList;
    try{
        const r = await fetch('Assets/Cities.csv', { cache:'force-cache' });
        if (!r.ok) throw new Error('cities.csv load failed');
        const text = await r.text();
        cityList = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(line=>{
        const parts = line.split(',').map(s=>s.trim());
        return parts.length>=2 ? `${parts[0]}, ${parts[1]}` : parts[0];
        });
        csvLoaded = true; 
    }catch(e){
        console.warn(e.message);
        cityList = [];
    }
    return cityList;
}

function renderSuggestions(list){
    if (!list.length) { sugg.innerHTML=''; return; }
    sugg.innerHTML = list.map(c=>`<button type="button" role="option" data-city="${c}">${c}</button>`).join('');
}

input.addEventListener('input', async ()=>{
    const q = input.value.trim().toLowerCase();
    if (!q){ renderSuggestions([]); return; }
    const all = await loadCitiesCsv();
    const out = all.filter(c => c.toLowerCase().includes(q)).slice(0,8);
    renderSuggestions(out);
});

sugg.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-city]');
    if (!btn) return;
    input.value = btn.dataset.city;
    sugg.innerHTML='';
    searchBtn.click();
});

// Day/Night toggle
function applyMode(isDark){
    app.classList.toggle('night', isDark);
    app.classList.toggle('day', !isDark);
    // As requested: keep text black in both modes
}
applyMode(false);
mode.addEventListener('change', ()=> applyMode(mode.checked));

// Helpers
function fmtTime(ms){ return new Date(ms).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function fmtDate(ms){ return new Date(ms).toLocaleDateString([], { weekday:'long', day:'2-digit', month:'short' }); }

function iconFor(id){
    // simple mapping; extend as needed with your Assets
    if (id >= 200 && id < 300) return `<img src="Assets/thunderstorm.svg" alt="Thunderstorm" class="descIcons" loading="lazy">`; // Thunderstorm
    if (id >= 300 && id < 500) return `<img src="Assets/drizzle.svg" alt="Drizzle" class="descIcons" loading="lazy">`; // Drizzle
    if (id >= 500 && id < 600) return `<img src="Assets/rain.svg" alt="Rain" class="descIcons" loading="lazy">`; // Rain
    if (id >= 600 && id < 700) return `<img src="Assets/snow.svg" alt="snow" class="descIcons" loading="lazy">`; // Snow
    if (id >= 700 && id < 800) return `<img src="Assets/wind.svg" alt="Atmosphere" class="descIcons" loading="lazy">`; // Atmosphere
    if (id === 800) return `<img src="Assets/clear-day.svg" alt="Clear" class="descIcons" loading="lazy">`; // Clear
    if (id > 800 && id < 900) return `<img src="Assets/cloudy.svg" alt="Clouds" class="descIcons" loading="lazy">`; // Clouds
    return '🌈'; // Default/fallback icon
}

function localTimeFromUTC(timestampSeconds, timezoneOffSeconds) {
    const dt = new Date(timestampSeconds* 1000);
    const localTimeMs = dt.getTime();
    const utcTimeMS = localTimeMs + (dt.getTimezoneOffset() * 60000);
    const cityTimeMs = utcTimeMS + (timezoneOffSeconds * 1000);
    return cityTimeMs;
}

function toF(c){return Math.round(c * 9/5 + 32); }

// Renderers
function renderCurrent(d, timezoneOffset){
    cityTitle.textContent = `${d.name}, ${d.sys.country}`;
    const currentCityTimeMs = localTimeFromUTC(d.dt, timezoneOffset);
    timeNow.textContent = fmtTime(currentCityTimeMs);
    dateNow.textContent = fmtDate(currentCityTimeMs);
    tempNow.textContent = `${Math.round(d.main.temp)}°C / ${toF(Math.round(d.main.temp))}°F`;
    feelsLike.textContent = `${Math.round(d.main.feels_like)}°C / ${toF(Math.round(d.main.feels_like))}°F`;
    const sunriseLocalMs = localTimeFromUTC(d.sys.sunrise, timezoneOffset);
    const sunsetLocalMs = localTimeFromUTC(d.sys.sunset, timezoneOffset);
    sunriseEl.textContent = fmtTime(sunriseLocalMs);
    sunsetEl.textContent = fmtTime(sunsetLocalMs);
    hum.innerHTML = `${d.main.humidity}%`;
    wind.textContent = `${Math.round(d.wind.speed)} m/s`;
    press.textContent = `${d.main.pressure} hPa`;
    vis.textContent = d.visibility!=null ? `${Math.round(d.visibility/1000)} km` : '—';
    desc.innerHTML = `${iconFor(d.weather[0].id)} ${d.weather[0].description}`;
}

function pickNextFive(list){
    const noon = list.filter(it => it.dt_txt?.includes('12:00:00'));
    const five = (noon.length>=5? noon.slice(0,5) : list.slice(0,5));
    return five.map(it => ({
        date:new Date(it.dt*1000), temp:Math.round(it.main.temp), id:it.weather[0].id
    }));
}
 //
function render5Day(list, timezoneOffset){
    const five = pickNextFive(list);
    strip5.innerHTML = five.map(d =>
        `<div class="tile">
            <div>${iconFor(d.id)}</div>
            <div class="t">${d.temp}°C</div>
            <div>${d.date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>`).join('');
}

function renderHourly(list, timezoneOffset){
    const next8 = (list || []).slice(0, 8);
    if (!next8.length) { hourlyStrip.innerHTML = ''; return; }
    hourlyStrip.innerHTML = next8.map(it => {
        const cityTimeMs = localTimeFromUTC(it.dt, timezoneOffset);
        const dt = new Date(cityTimeMs);
        return `<div class="tile">
                    <div>${dt.toLocaleTimeString([], { hour:'2-digit' })}</div>
                    <div style="font-size:22px">${iconFor(it.weather[0].id)}</div>
                    <div class="t">${Math.round(it.main.temp)}°C</div><br>
                    <div>Wind: ${Math.round(it.wind.speed)} m/s</div>
                </div>`;
    }).join('');
}

// Fetch and orchestrate
async function fetchCity(city){
    try{
        say('Loading...');
        const r1 = await fetch(W_NOW(city));
        if (!r1.ok) throw new Error('⚠️ City not found or API error');
        const now = await r1.json();
        renderCurrent(now, now.timezone);
        const r2 = await fetch(W_FORE(city));
        if (r2.ok){
            const fore = await r2.json();
            const timezoneOffset = now.timezone;
            render5Day(fore.list || [], timezoneOffset);
            renderHourly((fore.list || []).slice(0,8), timezoneOffset);
        } else{
            render5Day([]); renderHourly([]);
        }
        say('');
    } catch(e){
        console.error(e);
        say(e.message || 'Failed to load weather', true);
    }
}

// 2) Persist last city + support ?q=City
function bootCity(){
  const fromUrl  = new URLSearchParams(location.search).get('q');
  const lastCity = localStorage.getItem('lastCity');
  const seed = fromUrl || lastCity;
  if (seed){ input.value = seed; fetchCity(seed); }
}
bootCity();

const _fetchCity = fetchCity;                               // keep name intact
fetchCity = async function(city){                           // wrap without renaming usage
  history.replaceState(null, '', `?q=${encodeURIComponent(city)}`);
  await _fetchCity(city);
  localStorage.setItem('lastCity', city);
};

// Events
searchBtn.addEventListener('click', ()=>{
    const q = input.value.trim();
    if (!q) { say('Enter a city'); return; }
    fetchCity(q);
});

input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') {searchBtn.click(); sugg.innerHTML = '';} });

// current location (best effort)
locBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        say('Geolocation not supported', true);
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos)=>{
        try{
            say('Loading current location...');
            const { latitude, longitude } = pos.coords;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
            const r = await fetch(url);
            if (!r.ok) throw new Error('Location fetch failed');
            const now = await r.json();
            input.value = `${now.name}, ${now.sys.country}`;
            renderCurrent(now, now.timezone);
            const rf = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`);
            const fore = await rf.json();
            const timezoneOffset = now.timezone;
            render5Day(fore.list || [], timezoneOffset);
            renderHourly((fore.list || []).slice(0,8), timezoneOffset);
            say('');
        } catch(e){ say(e.message, true); }
    }, ()=> say('Location permission denied', true));
});
