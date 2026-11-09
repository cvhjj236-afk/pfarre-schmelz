import json,re,urllib.parse,urllib.request,pathlib,hashlib,concurrent.futures
pages=json.load(open('lib/legacy-source.json'));valid=[p for p in pages if p['status']==200];pathmap={p['path']:'artikel-'+re.sub('[^a-z0-9]+','-',urllib.parse.unquote(p['path']).lower()).strip('-') for p in valid}
pathmap['_overlay/gebetsschatz.htm']=pathmap['gebetsschatz.htm']
route={'index.html':'start','inhalt.htm':'inhalt','kalender.htm':'dekanat','pfarre.htm':'pfarre','glaube.htm':'glaube','vorschau.htm':'kalender'}
assets={};out=[]
for p in valid:
 if p['path'] in ['index.html','inhalt.htm','kalender.htm','vorschau.htm']:continue
 links=[];seen=set()
 for l in p['links']:
  label=' '.join(l['label'].split());href=l['href']
  if label in ['TOP','OP','Nach oben','Anfang','Seitenanfang'] or not label:continue
  if href.startswith('file:'):
   if 'Abk.htm' in href:href='Abk.htm'
   else:continue
  if href.startswith('/F:') and 'gebetsschatz' in href:href='gebetsschatz.htm'
  u=urllib.parse.urlsplit(urllib.parse.urljoin('http://www.pfarreschmelz.at/'+p['path'],href))
  if u.scheme not in ['http','https','mailto','tel']:continue
  if u.hostname in ['www.pfarreschmelz.at','pfarreschmelz.at']:
   path=urllib.parse.quote(urllib.parse.unquote(u.path.lstrip('/')),safe='/')
   if path.endswith(('.htm','.html')):
    target=route.get(path,pathmap.get(path))
    if not target:continue
    if path==p['path'] and u.fragment:target=pathmap[path]
    href='/#'+target
   else:href=u.geturl()
  else:href=u.geturl()
  key=(label,href)
  if key not in seen:links.append({'label':label,'href':href});seen.add(key)
 text=re.sub(r'(?<!\n)\n(?!\n)',' ',p['text']).replace('\xa0',' ')
 # Remove inherited secondary navigation from the body; retain its links separately.
 if text.startswith('Nach oben'):
  chunks=text.split('\n\n')
  text='\n\n'.join(chunks[1:]).strip()
 text=re.sub(r'\n\n(?:TOP|OP|Seitenanfang)\b','',text)
 text=re.sub(r'\n(?:\s*\n){2,}','\n\n',text)
 images=[]
 for im in p['images']:
  if im.get('width') in ['12','78']:continue
  src=urllib.parse.urljoin('http://www.pfarreschmelz.at/'+p['path'],im.get('xthumbnail-orig-image',im.get('src','')))
  if not src.startswith('http://www.pfarreschmelz.at/'):continue
  ext=pathlib.Path(urllib.parse.urlsplit(src).path).suffix.lower();dest='legacy/'+hashlib.sha256(src.encode()).hexdigest()[:16]+ext
  assets[src]=dest;images.append({'src':'/'+dest,'alt':im.get('alt') or 'Abbildung aus „'+p['title']+'“'})
 title={'pgr.htm':'Pfarrgemeinderat','priester%20-%20Kopie.htm':'Priester & Seelsorge'}.get(p['path'],p['title'])
 out.append({'slug':pathmap[p['path']],'title':title,'text':text or 'Auf der bisherigen Website ist dieser Bereich angelegt, enthält derzeit aber keinen eigenen Inhalt.','links':links,'images':images,'source':'http://www.pfarreschmelz.at/'+p['path']})
pathlib.Path('public/legacy').mkdir(exist_ok=True)
def fetch(item):
 src,dest=item
 try:
  target=pathlib.Path('public')/dest
  if not target.exists():target.write_bytes(urllib.request.urlopen(src,timeout=15).read())
  return '/'+dest
 except:return None
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:good=set(filter(None,ex.map(fetch,assets.items())))
for p in out:p['images']=[im for im in p['images'] if im['src'] in good]
pathlib.Path('lib/legacy-pages.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('Prepared',len(out),'pages with',len(good),'local images')
