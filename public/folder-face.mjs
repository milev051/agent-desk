export const folderPalette=['#1f8a5b','#1f7a86','#2f6fed','#6a4bb5','#b43d62','#c46a2f','#a38420','#4d5d66'];
export function parseFolderEmoji(value){
 if(value==null || value==='')return '';
 const text=String(value).trim();
 const parts=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(part=>part.segment);
 if(parts.length!==1 || parts[0].length>16 || !/\p{Extended_Pictographic}/u.test(parts[0]))throw new Error('Izaberi jedan emotikon.');
 return parts[0];
}
export function parseFolderColor(value){
 const color=typeof value==='number'?value:Number(value);
 if(!Number.isInteger(color) || color<0 || color>=folderPalette.length)throw new Error('Izaberi boju pozadine.');
 return color;
}
