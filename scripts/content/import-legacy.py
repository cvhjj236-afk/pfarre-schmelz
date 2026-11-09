import urllib.request,urllib.parse,json,re,concurrent.futures,pathlib
from html.parser import HTMLParser
ROOT='http://www.pfarreschmelz.at/'
class Parse(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.skip=0;self.text=[];self.links=[];self.images=[];self.title='';self.in_title=False;self.current=None
 def handle_starttag(self,t,a):
  a=dict(a)
  if t in ('script','style'):self.skip+=1
  if t=='title':self.in_title=True
  if t in ['p','div','br','tr','h1','h2','h3','li','blockquote'] and not self.skip:self.text.append('\n')
  if t=='a' and a.get('href'):self.current={'href':a['href'],'label':''};self.links.append(self.current)
  if t=='img':
   if a.get('alt') and self.current:self.current['label']+=a['alt']
   self.images.append(a)
 def handle_endtag(self,t):
  if t in ('script','style'):self.skip=max(0,self.skip-1)
  if t=='title':self.in_title=False
  if t=='a':self.current=None
  if t in ['p','div','tr','h1','h2','h3','li','blockquote'] and not self.skip:self.text.append('\n')
 def handle_data(self,d):
  if self.in_title:self.title+=d
  if not self.skip:
   self.text.append(d)
   if self.current:self.current['label']+=d

def get(path):
 try:
  r=urllib.request.urlopen(ROOT+path,timeout=20);s=r.read().decode('cp1252',errors='replace');all=Parse();all.feed(s)
  # FrontPage's shared border precedes the actual page body.
  start=re.search(r'<!--msnavigation-->\s*<td\b[^>]*>',s,re.I)
  main=s[start.end():] if start else s
  if start:main=main.split('<!--msnavigation-->')[0]
  p=Parse();p.feed(main)
  text=''.join(p.text);text=re.sub(r'[ \t\r\f\v]+',' ',text);text=re.sub(r' *\n *','\n',text);text=re.sub(r'\n{3,}','\n\n',text).strip()
  return {'path':path,'title':all.title.strip() or path,'text':text,'links':p.links,'images':p.images,'allLinks':all.links,'status':200}
 except Exception as e:return {'path':path,'status':'unavailable','error':str(e)}
seen=set();pending=['index.html','inhalt.htm','gottesdienste.htm','kalender.htm','pfarre.htm','glaube.htm'];pages=[]
while pending and len(seen)<160:
 batch=[x for x in pending if x not in seen];pending=[];seen.update(batch)
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
  for p in ex.map(get,batch):
   pages.append(p)
   if p['status']!=200:continue
   for l in p['allLinks']:
    href=l['href']
    if href.startswith(('file:','/F:','javascript:','mailto:')):continue
    u=urllib.parse.urlsplit(urllib.parse.urljoin(ROOT+p['path'],href))
    if u.hostname in ('www.pfarreschmelz.at','pfarreschmelz.at') and re.search(r'\.html?$',u.path,re.I):
     path=urllib.parse.quote(urllib.parse.unquote(u.path.lstrip('/')),safe='/')
     if path not in seen and path not in pending:pending.append(path)
 print('Fetched',len(pages),'pages; pending',len(pending),flush=True)
pathlib.Path('lib/legacy-source.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2))
print('DONE',len(pages),'pages;',sum(len(p.get('text','')) for p in pages),'text characters',flush=True)
for p in pages:print(p['path'],p['status'],len(p.get('text','')))
