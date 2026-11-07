// Red za povezan nalog: slika profila (ili početno slovo), naslov, opis i ikonice za radnje.
const paths={
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  remove:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  cancel:'<path d="M18 6 6 18M6 6l12 12"/>',
  use:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>'
};
export function iconSvg(name){return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;}
// Pretvara postojeće dugme u ikonicu; tekst ostaje u aria-label i title.
export function iconButton(button,name,label){button.innerHTML=iconSvg(name);button.classList.add('icon-action');button.setAttribute('aria-label',label);button.title=label;return button;}
// add: {label, run, disabled} dodaje poslednji red „+ Dodaj nalog“ u istom poravnanju kao nalozi.
export function renderAccounts(list,items,add=null){
  const rows=items.map(item=>{
    const row=document.createElement('li'),text=document.createElement('div'),title=document.createElement('b'),note=document.createElement('span');
    const letter=document.createElement('span');letter.className='account-avatar';letter.textContent=(item.title || '?').trim().charAt(0).toUpperCase();letter.setAttribute('aria-hidden','true');
    let avatar=letter;
    if(item.avatarUrl){const img=document.createElement('img');img.className='account-avatar';img.alt='';img.src=item.avatarUrl;img.onerror=()=>img.replaceWith(letter);avatar=img;}
    text.className='account-text';title.textContent=item.title;note.textContent=item.note || '';text.append(title,note);
    row.append(avatar,text);
    for(const action of item.actions || []){const button=document.createElement('button');button.type='button';if(action.icon)iconButton(button,action.icon,action.label);else button.textContent=action.label;button.disabled=!!action.disabled;button.onclick=action.run;row.append(button);}
    return row;
  });
  if(add){
    const row=document.createElement('li'),button=document.createElement('button'),circle=document.createElement('span'),text=document.createElement('span');
    row.className='account-add';button.type='button';button.disabled=!!add.disabled;button.onclick=add.run;
    circle.className='account-avatar';circle.innerHTML=iconSvg('plus');text.textContent=add.label;
    button.append(circle,text);row.append(button);rows.push(row);
  }
  list.replaceChildren(...rows);
}
