// Run: node tests/matcher.test.js
const P = require('../src/patterns.js');
const std = P.buildMatcher({ strictness: 'standard' });
const par = P.buildMatcher({ strictness: 'paranoid' });
const custom = P.buildMatcher({ strictness: 'standard', customKeywords: ['Big Twist', '/secret\\s*boss/'] });
let fail = 0;
function t(name, got, want) { if (got !== want) { fail++; console.log('FAIL', name, 'got', got); } }

const textHits = [
  'GTA 6 trailer is out', 'gta6', 'GTA VI', 'GTAVI', '#GTA6', '#GTAVI', 'gta-6', 'G.T.A. 6 leaks', 'G T A 6',
  'Grand Theft Auto VI', 'grand theft auto 6', 'Grand Theft Auto: VI', 'GTA Ⅵ', 'ＧＴＡ６', 'GTA6️⃣', 'g​ta 6',
  'gta six', 'GTA 6’s map', 'the next GTA', 'new GTA confirmed', 'GTA trailer', 'Vice City is back', 'vicecity',
  'Welcome to Leonida', 'Lucia Caminos', 'Lucía Caminos', 'Jason Duval', 'Jason and Lucia', 'Lucia & Jason',
  'Port Gellhorn', 'Grassrivers', 'Mount Kalaga', 'Cal Hampton', 'Boobie Ike', "Dre'Quan", 'Real Dimez', 'Raul Bautista',
  'Brian Heder', 'Project Americas', 'ГТА 6', '侠盗猎车手6', 'グランド・セフト・オートVI', '#gta6news', 'gtavileaks',
  'GTA6 ending explained', 'grandtheftautovi',
];
const textMiss = [
  'I love pizza', 'gtag(\'config\')', 'Omega 6 fatty acids', 'vegeta 6', 'video city', 
  'agta 6', 'Jason Statham', 'Lucia the cat', 'Duval county', 'take two steps', 'vice president', 'the city of vice',
  'You are a rockstar', 'gtavideo',
];
const paranoidOnly = [
  'GTA Online update', 'Grand Theft Auto V', 'Rockstar Games announced', "Rockstar's next game", 'Take-Two earnings',
  'Strauss Zelnick says', 'R* confirmed', 'GTA V', 'the GTA series', 'GTA 60fps mod',
];
for (const s of textHits) { t('std hit: ' + s, std.text(s), true); t('par hit: ' + s, par.text(s), true); }
for (const s of textMiss) { t('std miss: ' + s, std.text(s), false); t('par miss: ' + s, par.text(s), false); }
for (const s of paranoidOnly) { t('std miss(par-only): ' + s, std.text(s), false); t('par hit: ' + s, par.text(s), true); }

const urlHits = [
  'https://www.rockstargames.com/VI', 'https://www.rockstargames.com/de/VI/', 'https://www.google.com/search?q=gta+6+release',
  'https://www.youtube.com/results?search_query=gta%206', 'https://news.site/gaming/gta-6-trailer-3', 'https://reddit.com/r/GTA6/',
  'https://reddit.com/r/GTAVI/comments/abc', 'https://ign.com/articles/grand-theft-auto-vi-review', 'https://x.com/hashtag/GTA6',
  'https://example.com/vice-city-map', 'https://example.com/leonida', 'https://example.com/jason-and-lucia',
  'https://www.google.com/search?q=%22gta%20vi%22',
];
const urlMiss = [
  'https://www.google.com/search?q=pizza', 'https://www.googletagmanager.com/gtag/js?id=G-1', 'https://example.com/omega-6',
  'https://youtube.com/watch?v=abc123', 
];
const urlParanoid = ['https://gtaforums.com/topic/1', 'https://www.rockstargames.com/', 'https://reddit.com/r/GTA/', 'https://reddit.com/r/gtaonline', 'https://www.rockstarintel.com/', 'https://example.com/gta-5-mods', 'https://example.com/gta-video-editing'];
for (const s of urlHits) { t('url std hit: ' + s, std.url(s), true); }
for (const s of urlMiss) { t('url std miss: ' + s, std.url(s), false); t('url par miss: ' + s, par.url(s), false); }
for (const s of urlParanoid) { t('url std miss(par-only): ' + s, std.url(s), false); t('url par hit: ' + s, par.url(s), true); }

t('custom phrase', custom.text('what a BIG-twist that was'), true);
t('custom regex', custom.text('the secret   boss fight'), true);
t('custom url', custom.url('https://x.com/big_twist'), true);
t('custom miss', custom.text('bigtwister'), false);
t('allowlist sub', P.hostAllowed('m.youtube.com', ['youtube.com']), true);
t('allowlist other', P.hostAllowed('notyoutube.com', ['youtube.com']), false);

console.log(fail ? `${fail} failures` : 'all matcher tests passed');
process.exit(fail ? 1 : 0);
