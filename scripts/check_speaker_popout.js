const sp = require('../speaker_profiles.js');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tpl = fs.readFileSync(path.join(root, 'index.template.html'), 'utf8');
const agenda = fs.readFileSync(path.join(root, 'agenda.template.html'), 'utf8');

const cards = sp.extractSpeakerCards(agenda);
console.log('cards found:', cards.length, '->', cards.map(c => c.slug).join(', '));

const out = sp.injectSpeakerPopouts(tpl, agenda);
console.log('placeholder replaced:', !out.includes('<!-- SPEAKER_POPOUTS -->'));
console.log('popout ids:', (out.match(/id="popout-speaker-[a-z-]+"/g) || []).join(', '));
console.log('popout slugs:', (out.match(/data-popout-slug="[a-z-]+"/g) || []).join(', '));
console.log('leftover "id=speaker-" (should be 0):', (out.match(/\sid="speaker-[a-z-]+"/g) || []).length);
console.log('popout card class applied:', (out.match(/speaker-popout-card/g) || []).length, 'occurrences');
console.log('mini photo buttons:', (out.match(/class="speaker-mini-photo"/g) || []).length);
console.log('mini slugs:', (out.match(/data-speaker-popout="[a-z]+"/g) || []).join(', '));
