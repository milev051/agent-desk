export function advanceColumns(columns,listing){
 const current=columns.findIndex(c=>c.path===listing.path);
 if(current>=0)return columns.slice(0,current+1);
 const parent=columns.findIndex(c=>c.path===listing.parent);
 return parent>=0?[...columns.slice(0,parent+1),listing]:[listing];
}
