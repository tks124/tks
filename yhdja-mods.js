
// ===== 基础数据（与游戏一致）=====
var BASE_FACTIONS = { police:'政府', robber:'帮派', security:'保安公司', neutral:'中立' };
var BASE_WEAPONS = {
  pistol:{name:'手枪',mag:12,dmg:12,rate:0.35,reload:1.8,range:3,spread:0.07,speedMod:1,isSniper:false},
  responder_gun:{name:'改装手枪',mag:15,dmg:8,rate:0.15,reload:1.8,range:2.5,spread:0.2,speedMod:1,isSniper:false},
  smg:{name:'冲锋枪',mag:30,dmg:10,rate:0.08,reload:2.0,range:3.5,spread:0.15,speedMod:1,isSniper:false},
  rifle:{name:'步枪',mag:30,dmg:8,rate:0.12,reload:4.6,range:4,spread:0.25,speedMod:0.9,isSniper:false},
  sniper:{name:'狙击枪',mag:4,dmg:80,rate:1.5,reload:3.6,range:8,spread:0.01,speedMod:0.54,isSniper:true},
  gang_rifle:{name:'帮派步枪',mag:30,dmg:8,rate:0.12,reload:2.0,range:4,spread:0.2,speedMod:0.95,isSniper:false},
  military_rifle:{name:'军用步枪',mag:80,dmg:4,rate:0.1,reload:1.3,range:5,spread:0.3,speedMod:0.9,isSniper:false},
  boss_rifle:{name:'改装军用步枪',mag:100,dmg:7,rate:0.08,reload:1.2,range:6,spread:0.18,speedMod:1,isSniper:false},
  shield_item:{name:'防弹盾牌',mag:0,dmg:0,rate:0,reload:0,range:0,spread:0,speedMod:0.5,isSniper:false,isShield:true}
};

var customWeapons = {};
var customUnits = {};
var customFactions = {};   // key -> [enemyKeys]
var factionNames = Object.assign({}, BASE_FACTIONS);
var selection = { weapons:{}, units:{}, factions:{} };

// ===== 工具 =====
function toast(msg, type){
  var t = document.getElementById('toast');
  t.innerText = msg;
  t.className = 'toast show ' + (type||'');
  clearTimeout(t._tm);
  t._tm = setTimeout(function(){ t.className = 'toast'; }, 2400);
}
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

// ===== Tab =====
document.querySelectorAll('.tab').forEach(function(tab){
  tab.onclick = function(){
    document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.pane').forEach(function(p){ p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('pane-' + tab.getAttribute('data-pane')).classList.add('active');
  };
});

// ===== 武器 =====
function addWeapon(){
  var name = document.getElementById('wName').value.trim() || '自定义武器';
  var key = 'custom_w_' + Date.now();
  var isSniper = document.getElementById('wSniper').checked;
  customWeapons[key] = {
    name: name,
    mag: parseInt(document.getElementById('wMag').value) || 20,
    dmg: parseFloat(document.getElementById('wDmg').value) || 20,
    rate: parseFloat(document.getElementById('wRate').value) || 0.2,
    reload: parseFloat(document.getElementById('wReload').value) || 1.5,
    range: parseFloat(document.getElementById('wRange').value) || 4,
    spread: parseFloat(document.getElementById('wSpread').value) || 0.1,
    speedMod: isSniper ? 0.5 : 1,
    isSniper: isSniper
  };
  selection.weapons[key] = true;
  renderAll();
  toast('武器「' + name + '」已添加', 'ok');
}
function delWeapon(k){ delete customWeapons[k]; delete selection.weapons[k]; renderAll(); }

// ===== 单位 =====
function addUnit(){
  var name = document.getElementById('uName').value.trim() || '自定义单位';
  var key = 'custom_u_' + Date.now();
  var wKey = document.getElementById('uWeapon').value || null;
  var u = {
    name: name,
    icon: document.getElementById('uIcon').value,
    hp: parseInt(document.getElementById('uHp').value) || 50,
    armor: 0,
    speed: parseFloat(document.getElementById('uSpeed').value) || 0.4,
    r: 8,
    color: '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0'),
    team: document.getElementById('uFaction').value,
    view: parseInt(document.getElementById('uView').value) || 260,
    weaponKey: wKey,
    behavior: document.getElementById('uBehavior').value,
    author: document.getElementById('uAuthor').value.trim() || 'Anonymous'
  };
  if (wKey === 'shield_item') u.shield = true;
  customUnits[key] = u;
  selection.units[key] = true;
  renderAll();
  toast('单位「' + name + '」已添加', 'ok');
}
function delUnit(k){ delete customUnits[k]; delete selection.units[k]; renderAll(); }

// ===== 势力 =====
function addFaction(){
  var name = document.getElementById('fName').value.trim();
  if (!name) { toast('请输入势力名称', 'err'); return; }
  var key = 'custom_f_' + Date.now();
  factionNames[key] = name;
  var sel = document.getElementById('fEnemies');
  var enemies = [];
  for (var i=0;i<sel.options.length;i++) if (sel.options[i].selected) enemies.push(sel.options[i].value);
  customFactions[key] = enemies;
  // 双向
  enemies.forEach(function(e){
    if (!customFactions[e]) customFactions[e] = [];
    if (customFactions[e].indexOf(key) < 0) customFactions[e].push(key);
  });
  selection.factions[key] = true;
  renderAll();
  toast('势力「' + name + '」已添加', 'ok');
}
function delFaction(k){
  delete customFactions[k]; delete factionNames[k]; delete selection.factions[k];
  for (var f in customFactions) {
    customFactions[f] = customFactions[f].filter(function(x){ return x !== k; });
  }
  renderAll();
}

// ===== 渲染 =====
function renderAll(){
  renderWeaponList();
  renderUnitList();
  renderFactionList();
  renderSelects();
  renderSelection();
}

function renderWeaponList(){
  var box = document.getElementById('weaponList');
  var keys = Object.keys(customWeapons);
  if (!keys.length) { box.innerHTML = '<div class="empty">还没有自定义武器</div>'; return; }
  box.innerHTML = keys.map(function(k){
    var w = customWeapons[k];
    return '<div class="item"><div><div class="name">' + esc(w.name) + '</div>' +
      '<div class="meta">伤害 ' + w.dmg + ' · 弹容 ' + w.mag + ' · 射速 ' + w.rate + 's · 射程 ' + w.range + 'm' + (w.isSniper?' · 狙击':'') + '</div></div>' +
      '<button class="btn btn-red btn-sm" onclick="delWeapon(\'' + k + '\')">删除</button></div>';
  }).join('');
}

function renderUnitList(){
  var box = document.getElementById('unitList');
  var keys = Object.keys(customUnits);
  if (!keys.length) { box.innerHTML = '<div class="empty">还没有自定义单位</div>'; return; }
  box.innerHTML = keys.map(function(k){
    var u = customUnits[k];
    var w = u.weaponKey ? (customWeapons[u.weaponKey] || BASE_WEAPONS[u.weaponKey]) : null;
    return '<div class="item"><div><div class="name">' + esc(u.name) + '</div>' +
      '<div class="meta">' + esc(factionNames[u.team]||u.team) + ' · 血量 ' + u.hp + ' · 速度 ' + u.speed +
      ' · ' + (w ? esc(w.name) : '无武器') + '</div></div>' +
      '<button class="btn btn-red btn-sm" onclick="delUnit(\'' + k + '\')">删除</button></div>';
  }).join('');
}

function renderFactionList(){
  var box = document.getElementById('factionList');
  var keys = Object.keys(customFactions);
  if (!keys.length) { box.innerHTML = '<div class="empty">还没有自定义势力</div>'; return; }
  box.innerHTML = keys.map(function(k){
    var enemies = (customFactions[k]||[]).map(function(e){ return factionNames[e]||e; }).join('、') || '无';
    return '<div class="item"><div><div class="name">' + esc(factionNames[k]||k) + '</div>' +
      '<div class="meta">敌对：' + esc(enemies) + '</div></div>' +
      '<button class="btn btn-red btn-sm" onclick="delFaction(\'' + k + '\')">删除</button></div>';
  }).join('');
}

function renderSelects(){
  // 单位表单：势力
  var fSel = document.getElementById('uFaction');
  var curF = fSel.value;
  fSel.innerHTML = Object.keys(factionNames).map(function(k){
    return '<option value="' + k + '">' + esc(factionNames[k]) + '</option>';
  }).join('');
  if (curF) fSel.value = curF;

  // 单位表单：武器
  var wSel = document.getElementById('uWeapon');
  var curW = wSel.value;
  var opts = '<option value="">无武器</option>';
  Object.keys(BASE_WEAPONS).forEach(function(k){
    opts += '<option value="' + k + '">' + esc(BASE_WEAPONS[k].name) + '</option>';
  });
  Object.keys(customWeapons).forEach(function(k){
    opts += '<option value="' + k + '">' + esc(customWeapons[k].name) + '（自定义）</option>';
  });
  wSel.innerHTML = opts;
  if (curW) wSel.value = curW;

  // 势力表单：敌对
  var eSel = document.getElementById('fEnemies');
  var curE = Array.from(eSel.selectedOptions || []).map(function(o){ return o.value; });
  eSel.innerHTML = Object.keys(factionNames).map(function(k){
    return '<option value="' + k + '">' + esc(factionNames[k]) + '</option>';
  }).join('');
  Array.from(eSel.options).forEach(function(o){ if (curE.indexOf(o.value) >= 0) o.selected = true; });
}

function renderSelection(){
  function build(cat, data, labelFn){
    var keys = Object.keys(data);
    if (!keys.length) return '<div style="font-size:10.5px;color:#64748b;padding:4px 6px;">暂无</div>';
    return keys.map(function(k){
      var ck = selection[cat][k] ? 'checked' : '';
      return '<label><input type="checkbox" ' + ck + ' onchange="toggleSel(\'' + cat + '\',\'' + k + '\',this.checked)"> ' + esc(labelFn(k)) + '</label>';
    }).join('');
  }
  document.getElementById('selWeapons').innerHTML = build('weapons', customWeapons, function(k){ return customWeapons[k].name; });
  document.getElementById('selUnits').innerHTML = build('units', customUnits, function(k){ return customUnits[k].name; });
  document.getElementById('selFactions').innerHTML = build('factions', customFactions, function(k){ return factionNames[k]||k; });

  var nw = Object.keys(selection.weapons).length;
  var nu = Object.keys(selection.units).length;
  var nf = Object.keys(selection.factions).length;
  document.getElementById('exSummary').innerText = '已选：' + (nw+nu+nf) + ' 项（武器 ' + nw + ' / 单位 ' + nu + ' / 势力 ' + nf + '）';
}

function toggleSel(cat, key, val){
  if (val) selection[cat][key] = true; else delete selection[cat][key];
  renderSelection();
}
function selAll(cat, val){
  var src = cat === 'weapons' ? customWeapons : cat === 'units' ? customUnits : customFactions;
  selection[cat] = {};
  if (val) Object.keys(src).forEach(function(k){ selection[cat][k] = true; });
  renderSelection();
}

// ===== 导出 =====
function exportMod(){
  var selW = {}, selU = {}, selF = {};
  Object.keys(selection.weapons).forEach(function(k){ if (customWeapons[k]) selW[k] = customWeapons[k]; });
  Object.keys(selection.units).forEach(function(k){ if (customUnits[k]) selU[k] = customUnits[k]; });
  Object.keys(selection.factions).forEach(function(k){ if (customFactions[k]) selF[k] = customFactions[k]; });

  var total = Object.keys(selW).length + Object.keys(selU).length + Object.keys(selF).length;
  if (total === 0) { toast('请先勾选要导出的内容', 'err'); return; }

  var author = document.getElementById('exAuthor').value.trim() || 'Admin';
  var modVersion = document.getElementById('exVersion').value.trim() || '1.0.0';
  var fileName = document.getElementById('exName').value.trim() || 'my-mod';
  if (!/\.yhdja$/i.test(fileName)) fileName += '.yhdja';

  var modData = {
    'mods.txt': 'Author: ' + author + '\nModVersion: ' + modVersion + '\nSoftVersion: 1.0.0',
    'dy.json': selU,
    'wq.json': selW,
    'sl.json': selF
  };

  var blob = new Blob([JSON.stringify(modData, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1200);
  toast('导出成功：' + fileName + '（' + total + ' 项）', 'ok');
}

function clearAll(){
  if (!confirm('确定清空所有已制作的武器、单位与势力？')) return;
  customWeapons = {}; customUnits = {}; customFactions = {};
  factionNames = Object.assign({}, BASE_FACTIONS);
  selection = { weapons:{}, units:{}, factions:{} };
  renderAll();
  toast('已清空');
}

// 初始化
renderAll();
