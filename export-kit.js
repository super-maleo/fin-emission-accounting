// 导出：Word（.docx）、Excel（.xlsx）、CSV、PDF；长表格分页。最后加载。

// ---------- ZIP（存储模式） ----------
const CRC_TABLE = (()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipFiles(files) {
  const enc=new TextEncoder();
  const parts=[],central=[];let offset=0;
  const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  files.forEach(file=>{
    const name=enc.encode(file.name),data=typeof file.data==="string"?enc.encode(file.data):file.data,crc=crc32(data);
    const header=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(dosTime),...u16(dosDate),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
    parts.push(header,name,data);
    central.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(dosTime),...u16(dosDate),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),name);
    offset+=header.length+name.length+data.length;
  });
  const size=central.reduce((sum,part)=>sum+part.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(size),...u32(offset),0,0]);
  return new Blob([...parts,...central,end],{type:"application/zip"});
}
function saveBlob(blob,name){const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),2000);}
const xmlEsc=text=>String(text??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
function cellText(node){return (node.innerText??node.textContent??"").replace(/\s*\n\s*/g," ").trim();}
function numericValue(text) {
  const clean=String(text).replace(/,/g,"").trim();
  return /^[+\-−]?\d+(\.\d+)?$/.test(clean)?Number(clean.replace("−","-")):null;
}
function safeName(text){return String(text).replace(/[\\/:*?"<>|]/g,"_").slice(0,80);}

// ---------- Excel ----------
function colName(index){let name="";index++;while(index>0){const m=(index-1)%26;name=String.fromCharCode(65+m)+name;index=Math.floor((index-1)/26);}return name;}
function xlsxBlob(sheets) {
  const used=new Set();
  sheets=sheets.map((sheet,index)=>{let name=String(sheet.name||"Sheet"+(index+1)).replace(/[\\\/\?\*\[\]:]/g," ").slice(0,28)||"Sheet";let base=name,n=2;while(used.has(name))name=base.slice(0,25)+" "+(n++);used.add(name);return {...sheet,name};});
  const sheetXml=sheet=>{
    const widths=[];
    sheet.rows.forEach(row=>row.forEach((value,c)=>{const len=String(value??"").length;widths[c]=Math.min(60,Math.max(widths[c]||8,len*1.6+2));}));
    const rows=sheet.rows.map((row,r)=>'<row r="'+(r+1)+'">'+row.map((value,c)=>{
      const ref=colName(c)+(r+1),style=(sheet.headers||[]).includes(r)?' s="1"':(sheet.titles||[]).includes(r)?' s="2"':'';
      const num=typeof value==="number"?value:numericValue(value);
      if(value===""||value===null||value===undefined)return '';
      return num!==null&&!(sheet.titles||[]).includes(r)?'<c r="'+ref+'"'+style+'><v>'+num+'</v></c>':'<c r="'+ref+'" t="inlineStr"'+style+'><is><t xml:space="preserve">'+xmlEsc(value)+'</t></is></c>';
    }).join("")+'</row>').join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews>'+
      (widths.length?'<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w.toFixed(1)+'" customWidth="1"/>').join("")+'</cols>':'')+'<sheetData>'+rows+'</sheetData></worksheet>';
  };
  const files=[
    {name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>'},
    {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:"xl/workbook.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
      sheets.map((s,i)=>'<sheet name="'+xmlEsc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>'},
    {name:"xl/_rels/workbook.xml.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+
      '<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:"xl/styles.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><sz val="10"/><name val="Microsoft YaHei"/></font><font><b/><sz val="13"/><color rgb="FF26890D"/><name val="Microsoft YaHei"/></font></fonts>'+
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F8EA"/><bgColor indexed="64"/></patternFill></fill></fills>'+
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'}
  ];
  sheets.forEach((sheet,i)=>files.push({name:"xl/worksheets/sheet"+(i+1)+".xml",data:sheetXml(sheet)}));
  const blob=zipFiles(files);
  return new Blob([blob],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function tableRows(table) {
  return [...table.querySelectorAll("tr")].map(tr=>[...tr.children].map(cellText));
}

// ---------- 报告结构提取 ----------
function reportStructure(doc) {
  const out={title:cellText(doc.querySelector(".rptCover h1")||{textContent:""}).replace(/(草稿|已核对|未核查|已核查)$/,"").trim(),
    titleLines:[...((doc.querySelector(".rptCover h1")||{}).childNodes||[])].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).filter(Boolean),
    tag:cellText(doc.querySelector(".rptTag")||{textContent:""}),meta:[...doc.querySelectorAll(".rptMeta>div")].map(div=>[cellText(div.querySelector("span")),cellText(div).replace(cellText(div.querySelector("span")),"").trim()]),sections:[]};
  doc.querySelectorAll(".rptSec").forEach(sec=>{
    const blocks=[];
    const walk=node=>{
      [...node.children].forEach(el=>{
        const tag=el.tagName.toLowerCase();
        if(tag==="h2")return;
        if(tag==="h3"||tag==="h4")blocks.push({type:"h3",text:cellText(el)});
        else if(tag==="p")blocks.push({type:"p",text:cellText(el)});
        else if(tag==="ul"||tag==="ol")el.querySelectorAll("li").forEach(li=>blocks.push({type:"li",text:cellText(li)}));
        else if(tag==="table")blocks.push({type:"table",rows:tableRows(el)});
        else if(el.classList.contains("rptKpis"))blocks.push({type:"table",rows:[["指标","数值","单位"],...[...el.children].map(div=>[cellText(div.querySelector("span")),cellText(div.querySelector("b")),cellText(div.querySelector("small"))])]});
        else if(el.classList.contains("sig"))blocks.push({type:"p",text:[...el.children].map(cellText).join("    ")});
        else if(tag==="svg"||el.classList.contains("rptLegend"))return;
        else walk(el);
      });
    };
    walk(sec);
    out.sections.push({title:cellText(sec.querySelector("h2")).replace(/^(\d+)/,"$1 "),blocks});
  });
  return out;
}

// ---------- Word ----------
function docxBlob(structure) {
  const run=(text,opts={})=>'<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/>'+(opts.bold?'<w:b/>':'')+(opts.color?'<w:color w:val="'+opts.color+'"/>':'')+(opts.size?'<w:sz w:val="'+opts.size+'"/><w:szCs w:val="'+opts.size+'"/>':'')+'</w:rPr><w:t xml:space="preserve">'+xmlEsc(text)+'</w:t></w:r>';
  const para=(text,style,opts={})=>'<w:p><w:pPr>'+(style?'<w:pStyle w:val="'+style+'"/>':'')+(opts.align?'<w:jc w:val="'+opts.align+'"/>':'')+(opts.bullet?'<w:ind w:left="360" w:hanging="240"/>':'')+'</w:pPr>'+run((opts.bullet?"• ":"")+text,opts)+'</w:p>';
  const table=rows=>{
    const cols=Math.max(...rows.map(row=>row.length));
    const width=9000,colW=Math.floor(width/cols);
    return '<w:tbl><w:tblPr><w:tblW w:w="'+width+'" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D0D5DD"/><w:bottom w:val="single" w:sz="4" w:color="D0D5DD"/><w:insideH w:val="single" w:sz="4" w:color="E5E7EB"/></w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'+
      '<w:tblGrid>'+Array.from({length:cols},()=>'<w:gridCol w:w="'+colW+'"/>').join("")+'</w:tblGrid>'+
      rows.map((row,r)=>'<w:tr>'+(r===0?'<w:trPr><w:tblHeader/></w:trPr>':'')+Array.from({length:cols},(_,c)=>'<w:tc><w:tcPr><w:tcW w:w="'+colW+'" w:type="dxa"/>'+(r===0?'<w:shd w:val="clear" w:color="auto" w:fill="F3F8EA"/>':'')+'</w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>'+run(row[c]??"",{bold:r===0,size:18})+'</w:p></w:tc>').join("")+'</w:tr>').join("")+'</w:tbl>'+para("");
  };
  let body=para("Deloitte.","Title",{bold:true,color:"26890D",size:44});
  (structure.titleLines.length?structure.titleLines:[structure.title]).forEach(line=>body+=para(line,"Title",{bold:true,size:36}));
  if(structure.tag)body+=para(structure.tag,"",{color:"A66A00"});
  if(structure.meta.length)body+=table([["项目","内容"],...structure.meta]);
  structure.sections.forEach(sec=>{
    body+=para(sec.title,"Heading1",{bold:true,size:30,color:"1F2937"});
    sec.blocks.forEach(block=>{
      if(block.type==="h3")body+=para(block.text,"Heading2",{bold:true,size:24});
      else if(block.type==="p")body+=para(block.text);
      else if(block.type==="li")body+=para(block.text,"",{bullet:true});
      else if(block.type==="table"&&block.rows.length)body+=table(block.rows);
    });
  });
  const documentXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1300" w:bottom="1300" w:left="1300" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/></w:pPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="86BC25"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr></w:style></w:styles>';
  const blob=zipFiles([
    {name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
    {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
    {name:"word/_rels/document.xml.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:"docProps/core.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+xmlEsc(structure.title)+'</dc:title><dc:creator>江南流体装备集团</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+new Date().toISOString().slice(0,19)+'Z</dcterms:created></cp:coreProperties>'},
    {name:"word/document.xml",data:documentXml},
    {name:"word/styles.xml",data:styles}
  ]);
  return new Blob([blob],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}

// ---------- 报告导出 ----------
function reportElement(){return document.querySelector("#content .rptDoc");}
function reportFileName() {
  const s=reportStructure(reportElement());
  return safeName((s.titleLines.join(" ")||s.title||"报告")+"-"+new Date().toISOString().slice(0,10));
}
function csvText(rows){return "﻿"+rows.map(row=>row.map(value=>{const text=String(value??"");return /[",\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;}).join(",")).join("\r\n");}
async function exportReport(format) {
  closeExportMenus();
  const doc=reportElement();
  if(!doc){showToast("当前页面没有报告");return;}
  const s=reportStructure(doc),name=reportFileName();
  if(format==="docx"){saveBlob(docxBlob(s),name+".docx");showToast("已导出 Word");return;}
  if(format==="xlsx") {
    const sheets=[{name:"封面",rows:[[s.titleLines.join(" ")||s.title],[],["项目","内容"],...s.meta],titles:[0],headers:[2]}];
    s.sections.forEach(sec=>{
      const rows=[[sec.title]],headers=[],titles=[0];
      sec.blocks.forEach(block=>{
        if(block.type==="table"){rows.push([]);headers.push(rows.length);rows.push(...block.rows);}
        else if(block.type==="h3"){rows.push([]);titles.push(rows.length);rows.push([block.text]);}
        else rows.push([block.text]);
      });
      sheets.push({name:sec.title,rows,headers,titles});
    });
    saveBlob(xlsxBlob(sheets),name+".xlsx");showToast("已导出 Excel");return;
  }
  if(format==="csv") {
    const rows=[[s.titleLines.join(" ")||s.title],...s.meta,[]];
    s.sections.forEach(sec=>{rows.push([sec.title]);sec.blocks.forEach(block=>{if(block.type==="table")rows.push(...block.rows);else rows.push([block.text]);});rows.push([]);});
    saveBlob(new Blob([csvText(rows)],{type:"text/csv;charset=utf-8"}),name+".csv");showToast("已导出 CSV");return;
  }
  if(format==="pdf")return exportPdf(doc,name);
}
async function exportPdf(doc,name) {
  showToast("正在生成 PDF…");
  await loadScriptOnce(VENDOR+"html2canvas.min.js");
  await loadScriptOnce(VENDOR+"jspdf.umd.min.js");
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({unit:"mm",format:"a4",compress:true});
  const pageW=210,pageH=297,margin=12,usableW=pageW-margin*2,usableH=pageH-margin*2;
  const clone=doc.cloneNode(true);
  const host=document.createElement("div");
  host.style.cssText="position:fixed;left:-10000px;top:0;width:820px;background:#fff;z-index:-1";
  clone.style.maxWidth="820px";clone.style.border="0";clone.style.padding="0 8px";
  clone.querySelectorAll(".rptToc").forEach(el=>el.remove());
  host.appendChild(clone);document.body.appendChild(host);
  const blocks=[];
  const cover=document.createElement("div");
  [...clone.children].filter(el=>!el.classList.contains("rptSec")).forEach(el=>cover.appendChild(el));
  clone.prepend(cover);
  blocks.push(cover);
  clone.querySelectorAll(".rptSec").forEach(sec=>{
    const parts=[...sec.children];
    let chunk=document.createElement("div");
    parts.forEach(el=>{
      if(el.tagName==="TABLE"&&el.rows.length>28) {
        const head=el.tHead?el.tHead.outerHTML:"";
        const bodyRows=[...el.tBodies[0].rows];
        for(let i=0;i<bodyRows.length;i+=28){
          const t=document.createElement("table");t.className=el.className;t.innerHTML=head+"<tbody>"+bodyRows.slice(i,i+28).map(r=>r.outerHTML).join("")+"</tbody>";
          chunk.appendChild(t);sec.appendChild(chunk);blocks.push(chunk);chunk=document.createElement("div");
        }
        el.remove();
      } else chunk.appendChild(el);
    });
    if(chunk.children.length){sec.appendChild(chunk);blocks.push(chunk);}
  });
  let y=margin,page=1;
  try {
    for(const block of blocks) {
      const canvas=await html2canvas(block,{scale:2,backgroundColor:"#ffffff",logging:false,useCORS:true});
      const h=canvas.height*usableW/canvas.width;
      if(y+h>pageH-margin&&y>margin){pdf.addPage();page++;y=margin;}
      if(h<=usableH){pdf.addImage(canvas.toDataURL("image/jpeg",0.92),"JPEG",margin,y,usableW,h);y+=h+2;continue;}
      const sliceH=Math.floor(canvas.width*usableH/usableW);
      for(let top=0;top<canvas.height;top+=sliceH){
        const part=document.createElement("canvas");part.width=canvas.width;part.height=Math.min(sliceH,canvas.height-top);
        part.getContext("2d").drawImage(canvas,0,top,canvas.width,part.height,0,0,canvas.width,part.height);
        const ph=part.height*usableW/part.width;
        if(y+ph>pageH-margin&&y>margin){pdf.addPage();page++;y=margin;}
        pdf.addImage(part.toDataURL("image/jpeg",0.92),"JPEG",margin,y,usableW,ph);y+=ph+2;
      }
    }
    const total=pdf.getNumberOfPages();
    for(let i=1;i<=total;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(150);pdf.text(i+" / "+total,pageW/2,pageH-5,{align:"center"});}
    pdf.save(name+".pdf");showToast("已导出 PDF（"+total+" 页）");
  } finally {host.remove();}
}
function exportMenu(handler,formats=[["docx","Word"],["xlsx","Excel"],["csv","CSV"],["pdf","PDF"]],label="导出") {
  return '<div class="exportMenu"><button class="btn" type="button" onclick="toggleExportMenu(event,this)">'+label+' ▾</button><div class="menuPop" hidden>'+
    formats.map(([key,text])=>'<button type="button" onclick="'+handler+'(\''+key+'\')"><b>'+text+'</b><small>.'+key+'</small></button>').join("")+'</div></div>';
}
function toggleExportMenu(event,button){event.stopPropagation();const pop=button.nextElementSibling;const open=pop.hidden;closeExportMenus();pop.hidden=!open;}
function closeExportMenus(){document.querySelectorAll(".exportMenu .menuPop").forEach(pop=>pop.hidden=true);}
document.addEventListener("click",event=>{if(!event.target.closest(".exportMenu"))closeExportMenus();});

// 页面表格导出（Excel / CSV）
function pageTables() {
  return [...document.querySelectorAll("#content table")].filter(table=>!table.closest(".rptDoc")&&table.rows.length>1);
}
function exportPageTables(format) {
  closeExportMenus();
  const tables=pageTables();
  if(!tables.length){showToast("当前页面没有可导出的表格");return;}
  const title=(document.querySelector("#content .head h1")||{textContent:"导出"}).textContent.trim();
  const name=safeName(title+"-"+new Date().toISOString().slice(0,10));
  const sheets=tables.map((table,index)=>{
    const panel=table.closest(".panel,.card");
    const caption=panel?.querySelector(".panelHead h3,h3")?.textContent.trim()||title+(tables.length>1?" "+(index+1):"");
    return {name:caption,rows:tableRows(table).map(row=>row.filter((_,i)=>!table.rows[0].children[i]||table.rows[0].children[i].textContent.trim()!==""||row[i]!=="")),headers:[0]};
  });
  if(format==="xlsx"){saveBlob(xlsxBlob(sheets),name+".xlsx");showToast("已导出 Excel");}
  else {const rows=[];sheets.forEach(sheet=>{if(sheets.length>1)rows.push([sheet.name]);rows.push(...sheet.rows,[]);});saveBlob(new Blob([csvText(rows)],{type:"text/csv;charset=utf-8"}),name+".csv");showToast("已导出 CSV");}
}
exportFirstTable = function () {exportPageTables("xlsx");};

// ---------- 长表格分页 ----------
const PAGER_STATE = {};
const PAGE_SIZE = 20;
function pagerKey(table,index){const panel=table.closest(".panel,.card");return state.top+"|"+state.group+"|"+state.page+"|"+(panel?.querySelector("h3")?.textContent||"")+"|"+index;}
function applyPagers() {
  document.querySelectorAll("#content .pager").forEach(el=>el.remove());
  [...document.querySelectorAll("#content table")].forEach((table,index)=>{
    if(table.closest(".rptDoc")||table.dataset.nopage!==undefined||!table.tBodies[0])return;
    const rows=[...table.tBodies[0].rows].filter(row=>!row.classList.contains("sumRow")&&!row.classList.contains("totalRow"));
    const size=Number(table.dataset.pageSize)||PAGE_SIZE;
    if(rows.length<=size)return;
    const key=pagerKey(table,index)+"|"+rows.length;
    const pages=Math.ceil(rows.length/size);
    let page=Math.min(PAGER_STATE[key]||1,pages);
    const show=()=>{rows.forEach((row,i)=>row.hidden=!(i>=(page-1)*size&&i<page*size));};
    show();
    const bar=document.createElement("div");bar.className="pager";
    const draw=()=>{
      const nums=[];for(let p=1;p<=pages;p++)if(p===1||p===pages||Math.abs(p-page)<=2)nums.push(p);else if(nums.at(-1)!=="…")nums.push("…");
      bar.innerHTML='<span>共 '+rows.length+' 条 · 第 '+((page-1)*size+1)+'–'+Math.min(page*size,rows.length)+' 条</span><div>'+
        '<button type="button" '+(page===1?'disabled':'')+' data-p="'+(page-1)+'">‹</button>'+nums.map(p=>p==="…"?'<em>…</em>':'<button type="button" class="'+(p===page?'active':'')+'" data-p="'+p+'">'+p+'</button>').join("")+
        '<button type="button" '+(page===pages?'disabled':'')+' data-p="'+(page+1)+'">›</button></div>';
    };
    bar.addEventListener("click",event=>{const p=Number(event.target.dataset?.p);if(!p)return;page=p;PAGER_STATE[key]=p;show();draw();});
    draw();
    (table.closest(".tableWrap")||table).after(bar);
  });
}
const renderBeforePager = render;
render = function () {
  renderBeforePager();
  try{applyPagers();}catch(error){console.error(error);}
};
