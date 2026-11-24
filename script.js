(function(){
  var file=document.getElementById('photo'),prev=document.getElementById('preview'),
      go=document.getElementById('go'),st=document.getElementById('status'),
      res=document.getElementById('result'),desc=document.getElementById('desc');
  var blob=null,sample=null;

  function setStatus(t){st.textContent=t}
  function toBlob(f){
    return new Promise(function(ok,bad){
      var img=new Image(),r=new FileReader();
      r.onerror=bad;
      r.onload=function(){
        img.onerror=bad;
        img.onload=function(){
          var s=Math.min(1,1024/Math.max(img.width,img.height)),c=document.createElement('canvas');
          c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
          c.getContext('2d').drawImage(img,0,0,c.width,c.height);
          prev.src=c.toDataURL('image/jpeg',.85);prev.classList.add('on');
          c.toBlob(function(b){b?ok(b):bad(new Error('blob'))},'image/jpeg',.85);
        };
        img.src=r.result;
      };
      r.readAsDataURL(f);
    });
  }
  file.addEventListener('change',function(){
    blob=null;go.disabled=true;res.classList.remove('on');
    if(!file.files[0])return;
    setStatus('Preparing photo...');
    toBlob(file.files[0]).then(function(b){blob=b;go.disabled=false;setStatus('')})
      .catch(function(){setStatus('Could not read that photo. Try another image.')});
  });

  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function list(tagName,items){var l=el(tagName);(items||[]).forEach(function(i){l.appendChild(el('li',null,String(i)))});return l}
  function col(title,tagName,items){var d=el('div');d.appendChild(el('h4',null,title));d.appendChild(list(tagName,items));return d}

  function render(d){
    res.textContent='';
    if(!d.is_wound){
      res.appendChild(el('h3',null,'No wound found in this photo'));
      res.appendChild(el('p',null,d.summary||'Try a clearer, closer photo in good light.'));
      res.classList.add('on');return;
    }
    var sev=['minor','moderate','urgent'].indexOf(d.severity)>-1?d.severity:'moderate';
    res.appendChild(el('span','sev '+sev,{minor:'Minor',moderate:'Needs attention',urgent:'Urgent: get medical help'}[sev]));
    res.appendChild(el('h3',null,d.wound_type||'Wound'));
    res.appendChild(el('p',null,d.summary||''));
    if(sev==='urgent'){
      var w=el('div','warn');w.appendChild(el('h4',null,'Call 112 or go to a hospital now'));
      var a=el('a','btn main','Show nearest hospitals');a.href='https://www.google.com/maps/search/hospitals+near+me';a.target='_blank';a.rel='noopener';
      w.appendChild(a);res.appendChild(w);
    }
    var cols=el('div','cols');
    cols.appendChild(col('What to do now','ol',d.steps));
    cols.appendChild(col('Care for the next days','ul',d.aftercare));
    res.appendChild(cols);
    var warn=el('div','warn');warn.appendChild(el('h4',null,'See a doctor if'));warn.appendChild(list('ul',d.see_doctor_if));res.appendChild(warn);
    if(d.buy&&d.buy.length){var s=el('div','shop');s.appendChild(el('strong',null,'Buy at a medical shop: '));s.appendChild(document.createTextNode(d.buy.join(', ')));res.appendChild(s)}
    var n=el('p','note','This is an AI estimate from a photo, not a diagnosis. '+(d.note||''));res.appendChild(n);
    var l=el('p');var m=el('a',null,'Find medical shops near me');m.href='https://www.google.com/maps/search/medical+store+near+me';m.target='_blank';m.rel='noopener';l.appendChild(m);res.appendChild(l);
    res.classList.add('on');res.scrollIntoView({behavior:'smooth',block:'start'});
  }

  // Set this to your deployed backend address (see README.md)
  var API_URL='https://YOUR-WORKER.workers.dev';

  go.addEventListener('click',function(){
    if(!blob)return;
    if(API_URL.indexOf('YOUR-')>-1){setStatus('The AI backend is not set up yet. Use the manual guide below.');return}
    go.disabled=true;setStatus('Analysing your photo...');
    var ctl=new AbortController(),timer=setTimeout(function(){ctl.abort()},60000);
    fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,
      body:JSON.stringify({image:prev.src.split(',')[1],mime:'image/jpeg',notes:desc.value.trim().slice(0,500)})})
    .then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json()})
    .then(function(d){clearTimeout(timer);setStatus('');render(d)})
    .catch(function(e){
      clearTimeout(timer);
      setStatus(e&&e.name==='AbortError'?'This took too long. Try a smaller photo or try again.':
        'Analysis failed. Try again, or use the manual guide below.');
    }).then(function(){go.disabled=false});
  });
})();
