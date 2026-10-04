export function usageDelta(total, baseline) {
  if(!baseline)return {...total,scope:'session'};
  const result={...total,scope:'run'};
  for(const key of ['input','output','cacheRead','cacheWrite','reasoning','total']) {
    if(total[key]===undefined)continue;
    if(baseline[key]===undefined || total[key]<baseline[key])return {...total,scope:'session'};
    result[key]=total[key]-baseline[key];
  }
  return result;
}
