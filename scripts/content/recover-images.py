import json,urllib.request,urllib.parse,hashlib,pathlib,concurrent.futures
source=json.load(open('lib/legacy-source.json'));pages=json.load(open('lib/legacy-pages.json'));by={p['source']:p for p in pages};jobs=[]
for p in source:
 page=by.get('http://www.pfarreschmelz.at/'+p['path'])
 if not page:continue
 for im in p.get('images',[]):
  if im.get('width') in ['12','78']:continue
  src=urllib.parse.urljoin('http://www.pfarreschmelz.at/'+p['path'],im.get('xthumbnail-orig-image',im.get('src','')))
  src=urllib.parse.quote(urllib.parse.unquote(src),safe=':/')
  ext=pathlib.Path(urllib.parse.urlsplit(src).path).suffix.lower()
  if ext not in ['.jpg','.jpeg','.gif','.png']:continue
  dest='legacy/'+hashlib.sha256(src.encode()).hexdigest()[:16]+ext
  jobs.append((page,src,dest,im.get('alt') or 'Abbildung aus „'+page['title']+'“'))
def get(j):
 page,src,dest,alt=j;target=pathlib.Path('public')/dest
 try:
  if not target.exists():target.write_bytes(urllib.request.urlopen(src,timeout=20).read())
  return page,{'src':'/'+dest,'alt':alt}
 except Exception as e:return None
count=0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 for result in ex.map(get,jobs):
  if result:
   page,im=result
   if not any(x['src']==im['src'] for x in page['images']):page['images'].append(im)
   count+=1
  if count and count%20==0:print('Images ready:',count,flush=True)
json.dump(pages,open('lib/legacy-pages.json','w'),ensure_ascii=False,indent=2)
print('Images available:',count,'of',len(jobs),flush=True)
