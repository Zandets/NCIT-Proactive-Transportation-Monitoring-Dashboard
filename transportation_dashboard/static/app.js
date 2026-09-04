const $ = (selector) => document.querySelector(selector);
const months = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul'];
const menuToggle = document.querySelector('#menuToggle');
const sidebar = document.querySelector('#sidebar');
menuToggle?.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
const tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.append(tip);
function addHover(el, text) { el.addEventListener('mouseenter', e => { tip.textContent = text; tip.style.display='block'; }); el.addEventListener('mousemove', e => { tip.style.left=`${e.clientX+12}px`; tip.style.top=`${e.clientY+12}px`; }); el.addEventListener('mouseleave', () => { tip.style.display='none'; }); }

function linePath(values) {
  const x = i => 42 + (i * 49); const y = value => 160 - ((value - 40) * 0.88);
  return values.map((value, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(value)}`).join(' ');
}
function drawCharts() {
  const series = [
    ['#0c8d95',[142,118,64,79,45,97,60,72,104,66,75,78]],
    ['#d64c4f',[116,128,94,125,50,77,71,69,109,70,72,77]],
    ['#d8ba55',[124,98,77,103,53,81,101,75,116,73,71,77]],
    ['#35bfca',[129,109,69,84,51,70,85,65,108,63,72,76]]
  ];
  $('#profitLines').innerHTML = series.map(([color, values]) => `<path d="${linePath(values)}" stroke="${color}"/>`).join('');
  [...document.querySelectorAll('#profitLines path')].forEach((line,i) => addHover(line, `${['USA','France','Germany','Switzerland'][i]} · hover points for monthly trend`));
  $('#months').innerHTML = months.map(m => `<span>${m}<br>2026</span>`).join('');
  $('#shortMonths').innerHTML = months.map(m => `<span>${m}</span>`).join('');
  const routes = [690,735,645,640,700,698,650,592,540,530,548,642];
  const times = [7.2,8.7,6.8,8.1,7.3,8,7.2,7.5,5.3,6.3,6.6,8.6];
  const x = i => 51 + i * 36.2; const y = value => 178 - (value / 800 * 150);
  const bars = routes.map((route,i) => `<rect x="${x(i)}" y="${y(route)}" width="13" height="${178-y(route)}" fill="#0c8d95"/>`).join('');
  const path = times.map((value,i) => `${i?'L':'M'} ${x(i)+6} ${180-value*16}`).join(' ');
  $('#deliveryMarks').innerHTML = `${bars}<path d="${path}" fill="none" stroke="#d64c4f" stroke-width="2" stroke-dasharray="4 3"/>${times.map((value,i)=>`<circle cx="${x(i)+6}" cy="${180-value*16}" r="2.5" fill="#d64c4f" data-hover="${months[i]} · ${value}h"/>`).join('')}`;
  [...document.querySelectorAll('#deliveryMarks rect')].forEach((bar,i) => addHover(bar, `${months[i]} · ${routes[i]} km`));
  [...document.querySelectorAll('#deliveryMarks circle')].forEach(circle => addHover(circle, circle.dataset.hover));
  renderMarks([{id:'V-204',marks:82},{id:'V-118',marks:66},{id:'V-307',marks:74},{id:'V-091',marks:91}]);
}

function renderMarks(rows) {
  const svg=$('#marksChart'); const width=600, height=170, max=Math.max(...rows.map(r=>r.marks),100); const step=width/Math.max(rows.length,1);
  svg.innerHTML=`<line class="marks-grid" x1="30" y1="145" x2="590" y2="145"/>${rows.map((r,i)=>{const h=(r.marks/max)*120;const x=40+i*step;return `<rect class="marks-bar" x="${x}" y="${145-h}" width="${Math.max(18,step-12)}" height="${h}" data-hover="${r.id} · ${r.marks} marks"/><text x="${x+4}" y="160" font-size="10">${r.id}</text>`}).join('')}`;
  svg.querySelectorAll('.marks-bar').forEach(bar=>addHover(bar,bar.dataset.hover));
  // Make the uploaded data visible in the main trend plot as well.
  const trend = rows.slice(0, 12).map(row => Math.max(0, Math.min(100, row.marks)));
  $('#profitLines').innerHTML = `<path d="${linePath(trend)}" stroke="#0c8d95"/>`;
  addHover($('#profitLines path'), `Uploaded marks · ${rows.length} rows`);
  const chartRows = rows.slice(0, 12), barWidth = 440 / Math.max(chartRows.length, 1);
  const uploadedBars = chartRows.map((row, i) => {
    const height = Math.max(2, Math.min(150, row.marks / 100 * 150));
    const x = 45 + i * barWidth;
    return `<rect x="${x}" y="${178 - height}" width="${Math.max(10, barWidth - 7)}" height="${height}" fill="#0c8d95" data-upload-hover="${row.id} · ${row.marks} marks"/><text x="${x}" y="198" font-size="9">${row.id}</text>`;
  }).join('');
  $('#deliveryMarks').innerHTML = uploadedBars;
  $('#deliveryMarks').querySelectorAll('rect').forEach(bar => addHover(bar, bar.dataset.uploadHover));
}
// Select first, then parse only when the user presses Submit file.
let selectedCsvFile = null;
$('#csvInput').addEventListener('change', event => {
  selectedCsvFile = event.target.files[0] || null;
  $('#csvSubmit').disabled = !selectedCsvFile;
  $('#csvStatus').textContent = selectedCsvFile ? `Selected: ${selectedCsvFile.name}` : 'No file loaded';
});
$('#csvSubmit').addEventListener('click', () => {
  const file = selectedCsvFile; if (!file) return;
  $('#csvStatus').textContent = `Reading ${file.name}…`;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) { $('#csvStatus').textContent = 'The file is empty'; return; }
    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    let cells = lines.map(line => line.split(delimiter).map(value => value.trim()));
    const first = cells[0].map(value => value.toLowerCase());
    if (first.includes('id') && first.includes('marks')) {
      const idIndex = first.indexOf('id'), marksIndex = first.indexOf('marks');
      cells = cells.slice(1).map(row => ({id: row[idIndex], marks: Number(row[marksIndex])}));
    } else {
      cells = cells.map(row => ({id: row[0], marks: Number(row[1])}));
    }
    const rows = cells.filter(row => row.id && Number.isFinite(row.marks));
    if (!rows.length) { $('#csvStatus').textContent = 'No numeric id/marks rows found'; return; }
    renderMarks(rows);
    $('#csvStatus').textContent = `Loaded ${rows.length} rows from ${file.name}`;
  };
  reader.readAsText(file);
});

async function load() {
  const data = await fetch('/api/overview').then(response => response.json());
  $('#vehicles').textContent = data.metrics.active_vehicles;
  $('#otp').textContent = `${Math.round(data.metrics.on_time_rate)}%`;
  $('#alertsCount').textContent = data.metrics.open_alerts;
  $('#impact').textContent = data.metrics.estimated_impacts;
  $('#updated').textContent = `Updated ${new Date(data.updated_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
}

$('#riskForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const fd = new FormData(event.currentTarget); const payload = Object.fromEntries(fd.entries());
  ['delay_minutes','speed_kph','vehicle_age_years','weather_risk'].forEach(key => payload[key] = Number(payload[key]));
  const output = $('#prediction'); output.textContent = 'Scoring trip…';
  try { const result = await fetch('/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(response => response.json());
    output.textContent = `${result.risk_band.toUpperCase()} RISK · ${Math.round(result.risk_score * 100)}% · ${result.model_name}`;
  } catch { output.textContent = 'Model service unavailable.'; }
});
drawCharts();
load().catch(() => { $('#updated').textContent = 'Preview mode · start FastAPI for live data'; });
fetch('/api/marks').then(response => response.json()).then(data => {
  if (data.rows?.length) { renderMarks(data.rows); $('#csvStatus').textContent = `Loaded ${data.rows.length} rows from ${data.source}`; }
}).catch(() => {});

// Supabase Image Upload
function initImageUpload() {
  const SUPABASE_URL = 'https://pnnhzqtsybensniilicr.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubmh6cXRzeWJlbnNuaWlsaWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2Njk5NDUsImV4cCI6MjEwMjI0NTk0NX0.s6RTxukG-9AoeqE8-VqdO9AMkUSTW9GWARsT9PZLzyE';
  
  // Check if Supabase is available
  if (!window.supabase) {
    console.error('Supabase library not loaded');
    return;
  }
  
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  
  let selectedImageFile = null;
  const imageUpload = $('#imageUpload');
  const imageUploadBtn = $('#imageUploadBtn');
  const imageUploadStatus = $('#imageUploadStatus');
  const uploadedImagePreview = $('#uploadedImagePreview');
  
  if (!imageUpload || !imageUploadBtn) {
    console.error('Image upload elements not found');
    return;
  }
  
  imageUpload.addEventListener('change', (event) => {
    selectedImageFile = event.target.files[0] || null;
    if (selectedImageFile) {
      imageUploadStatus.textContent = `Selected: ${selectedImageFile.name}`;
      imageUploadBtn.disabled = false;
    } else {
      imageUploadStatus.textContent = 'No file selected';
      imageUploadBtn.disabled = true;
    }
  });
  
  imageUploadBtn.addEventListener('click', async () => {
    if (!selectedImageFile) return;
    
    imageUploadStatus.textContent = `Uploading ${selectedImageFile.name}…`;
    imageUploadBtn.disabled = true;
    
    try {
      const fileName = `${Date.now()}-${selectedImageFile.name}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(`uploads/${fileName}`, selectedImageFile);
      
      if (error) throw error;
      
      const { data: publicData } = supabase.storage
        .from('images')
        .getPublicUrl(`uploads/${fileName}`);
      
      imageUploadStatus.textContent = `✓ Uploaded: ${selectedImageFile.name}`;
      uploadedImagePreview.innerHTML = `<img src="${publicData.publicUrl}" style="max-width:100%; border-radius:4px; max-height:200px;">`;
      
      imageUpload.value = '';
      selectedImageFile = null;
      imageUploadBtn.disabled = true;
      loadImageGallery();
    } catch (error) {
      imageUploadStatus.textContent = `Error: ${error.message}`;
      imageUploadBtn.disabled = false;
    }
  });
  
  imageUploadBtn.disabled = true;
}

async function loadImageGallery() {
  const gallery = $('#imageGallery');
  if (!gallery) return;
  try {
    const response = await fetch('/api/images');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Unable to load images');
    if (!data.images?.length) {
      gallery.innerHTML = '<span>No uploaded images</span>';
      return;
    }
    gallery.innerHTML = data.images.map(image =>
      `<img src="${image.url}" alt="${image.filename}" loading="lazy">`
    ).join('');
  } catch (error) {
    gallery.textContent = `Gallery error: ${error.message}`;
  }
}

// Initialize image upload when Supabase is ready
if (window.supabase) {
  initImageUpload();
} else {
  // Wait for Supabase to load from CDN
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initImageUpload, 1000);
  });
}

loadImageGallery();

let uploadBtn = document.querySelector("#file-upload");
uploadBtn.addEventListener("change", addimage);
function addimage() {
let reader;
if (this.files&& this.files[0]){
  reader = new FileReader();
  reader.onload = (e) => {
    imgObject.img.src = e.target.result;
    drawCharts();
  };
    reader.readAsDataURL(this.files[0]);
  }
}
