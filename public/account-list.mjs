// Red za povezan nalog: slika profila (ili početno slovo), naslov, opis i dugmad.
export function renderAccounts(list,items){
  list.replaceChildren(...items.map(item=>{
    const row=document.createElement('li'),text=document.createElement('div'),title=document.createElement('b'),note=document.createElement('span');
    const letter=document.createElement('span');letter.className='account-avatar';letter.textContent=(item.title || '?').trim().charAt(0).toUpperCase();letter.setAttribute('aria-hidden','true');
    let avatar=letter;
    if(item.avatarUrl){const img=document.createElement('img');img.className='account-avatar';img.alt='';img.src=item.avatarUrl;img.onerror=()=>img.replaceWith(letter);avatar=img;}
    text.className='account-text';title.textContent=item.title;note.textContent=item.note || '';text.append(title,note);
    row.append(avatar,text);
    for(const action of item.actions || []){const button=document.createElement('button');button.type='button';button.textContent=action.label;button.disabled=!!action.disabled;button.onclick=action.run;row.append(button);}
    return row;
  }));
}
