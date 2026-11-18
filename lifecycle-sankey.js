function lifecycleSankey(model) {
  const totals=lcaTotals(model);
  const total=lcaTotal(model);
  if(!total)return '<div class="emptyState">录入生命周期活动数据后生成桑基图。</div>';
  const colors=["#86bc25","#008a7a","#2c6aa0","#d59326","#8b729c"];
  const activities=model.stages.flatMap((stage,stageIndex)=>stage.enabled?stage.lines.map(line=>({
    name:line.name,value:lineEmission(model,line),stageIndex
  })):[]).sort((a,b)=>b.value-a.value);
  const hot=activities.slice(0,4);
  const remaining=activities.slice(4).reduce((sum,row)=>sum+row.value,0);
  if(remaining>0)hot.push({name:"其他活动",value:remaining,stageIndex:-1});
  const scale=230/total;
  let inOffset=0;
  let outOffset=0;
  let leftPosition=55;
  let rightPosition=55;
  const sources=totals.map((stage,index)=>{
    const width=stage.total*scale;
    const y=leftPosition+Math.max(36,width)/2;
    leftPosition+=Math.max(36,width)+8;
    const targetY=135+inOffset+width/2;
    inOffset+=width;
    return '<g class="sankeyItem" role="button" tabindex="0" aria-label="'+stage.name+
      '阶段明细" onclick="showLcaStageDetail('+index+')" onkeydown="if(event.key===\'Enter\')showLcaStageDetail('+index+')">'+
      '<path d="M 246 '+y+' C 355 '+y+' 390 '+targetY+' 488 '+targetY+
      '" fill="none" stroke="'+colors[index]+'" stroke-opacity=".48" stroke-width="'+width+'"/>'+
      '<path d="M 246 '+y+' C 355 '+y+' 390 '+targetY+' 488 '+targetY+'" fill="none" stroke="transparent" stroke-width="18"/>'+
      '<rect x="230" y="'+(y-Math.max(3,width)/2)+'" width="12" height="'+Math.max(3,width)+'" rx="2" fill="'+colors[index]+'"/>'+
      '<text x="16" y="'+(y-5)+'">'+stage.name+'</text><text class="sankeyValue" x="16" y="'+(y+15)+'">'+
      formatEmission(stage.total)+' kgCO₂e · '+(stage.total/total*100).toFixed(2)+'%</text></g>';
  }).join("");
  const targets=hot.map((activity,index)=>{
    const width=activity.value*scale;
    const y=rightPosition+Math.max(36,width)/2;
    rightPosition+=Math.max(36,width)+8;
    const startY=135+outOffset+width/2;
    outOffset+=width;
    const action=activity.stageIndex<0?"showLcaAllActivities()":"showLcaStageDetail("+activity.stageIndex+")";
    const name=activity.name.length>22?activity.name.slice(0,22)+"…":activity.name;
    return '<g class="sankeyItem" role="button" tabindex="0" aria-label="'+textHtml(activity.name)+'" onclick="'+action+
      '" onkeydown="if(event.key===\'Enter\'){'+action+'}">'+
      '<path d="M 508 '+startY+' C 650 '+startY+' 650 '+y+' 784 '+y+
      '" fill="none" stroke="'+colors[index]+'" stroke-opacity=".38" stroke-width="'+width+'"/>'+
      '<path d="M 508 '+startY+' C 650 '+startY+' 650 '+y+' 784 '+y+'" fill="none" stroke="transparent" stroke-width="18"/>'+
      '<rect x="784" y="'+(y-Math.max(3,width)/2)+'" width="12" height="'+Math.max(3,width)+'" rx="2" fill="'+colors[index]+'"/>'+
      '<text x="806" y="'+(y-5)+'">'+textHtml(name)+'</text><text class="sankeyValue" x="806" y="'+(y+15)+'">'+
      formatEmission(activity.value)+' kgCO₂e · '+(activity.value/total*100).toFixed(2)+'%</text></g>';
  }).join("");
  return '<div class="card"><h3>生命周期碳足迹流向</h3><div class="lifecycleSankey"><svg viewBox="0 0 1150 510" aria-label="生命周期碳足迹桑基图">'+
    '<text x="16" y="26" class="sankeyColumn">生命周期阶段</text><text x="440" y="26" class="sankeyColumn">产品总碳足迹</text>'+
    '<text x="806" y="26" class="sankeyColumn">活动贡献</text>'+sources+targets+
    '<rect x="488" y="135" width="20" height="230" rx="3" fill="#405124"/>'+
    '<text x="498" y="400" text-anchor="middle">'+textHtml(model.name)+'</text>'+
    '<text x="498" y="422" text-anchor="middle" class="sankeyTotal">'+formatEmission(total)+' kgCO₂e</text>'+
    '<text x="498" y="443" text-anchor="middle" class="sankeyValue">'+model.referenceFlow+' '+textHtml(model.flowUnit)+' / 参考流</text>'+
    '</svg></div></div>';
}
function showLcaAllActivities() {
  const model=activeLca();
  openModal('<h2>完整活动贡献</h2><div class="tableWrap"><table><thead><tr><th>阶段</th><th>活动</th><th>kgCO₂e / 参考流</th></tr></thead><tbody>'+
    model.stages.filter(stage=>stage.enabled).flatMap(stage=>stage.lines.map(line=>'<tr><td>'+stage.name+'</td><td>'+textHtml(line.name)+
      '</td><td>'+formatEmission(lineEmission(model,line))+'</td></tr>')).join("")+'</tbody></table></div>');
}
const productDashBeforeSankey=productDash;
productDash=function () {
  const html=productDashBeforeSankey();
  const marker='<div class="card"><div class="lcaStageHead">';
  return html.replace(marker,lifecycleSankey(activeLca())+marker);
};
