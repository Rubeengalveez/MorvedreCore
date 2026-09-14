from pathlib import Path
p=Path('lib/domain/acta-pdf.ts');s=p.read_text(encoding='utf-8-sig')
s=s.replace('const h=nameHeight+29;', 'const h=nameHeight+25;').replace('y+nameHeight+25,9,true','y+nameHeight+22,9,true').replace('line(14,y+h,182); y+=h+6;', 'line(14,y+h,182); y+=h+4;')
a=s.index('  if(a.rivalScorers.length){');b=s.index('  y = newPage("El partido, cuarto a cuarto");',a)
s=s[:a]+'''  if(a.rivalScorers.length){
    if(y+34>bottom()) y=newPage("Goleadores rivales");
    else {text("Goleadores rivales",14,y+4,13,true);y+=10;}
    for(let i=0;i<a.rivalScorers.length;i+=3){
      if(y+24>bottom()) y=newPage("Goleadores rivales");
      a.rivalScorers.slice(i,i+3).forEach((p,j)=>{
        const x=14+j*62;
        doc.setDrawColor(...LINE);doc.setLineWidth(.3);doc.rect(x,y,58,23);
        fill(x,y,1.2,23,ORANGE);
        text(`Gorro ${p.cap}`,x+4,y+6,10,true);
        text(`${p.goals} ${p.goals===1?"gol":"goles"}`,x+4,y+16,16,true);
        text(pct(p.share),x+54,y+16,13,true,ORANGE,"right");
        text("del total rival",x+54,y+21,8,false,NAVY,"right");
      });
      y+=27;
    }
  }
''' +s[b:]
p.write_text(s,encoding='utf-8')
