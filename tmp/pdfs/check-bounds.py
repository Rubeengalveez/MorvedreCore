import pdfplumber
for name in ['output/pdf/acta-redisenada.pdf','tmp/pdfs/stress.pdf','tmp/pdfs/empty.pdf']:
    issues=[]
    with pdfplumber.open(name) as doc:
        for i,p in enumerate(doc.pages):
            for word in p.extract_words():
                if word['x0']<0 or word['x1']>p.width or word['top']<0 or word['bottom']>p.height:
                    issues.append((i+1,word['text']))
        print(name,len(doc.pages),'páginas; texto fuera de página:',issues)
        assert not issues
