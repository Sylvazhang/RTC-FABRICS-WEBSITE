'use strict';
(() => {
 const {$,esc}=RTC;
 let selected=new Set(RTC.selected().map(p=>p.sku)),known=new Set(selected),requestId=crypto.randomUUID();
 let direct=false,serverVerification=false,web3forms=false,challenge=null,busy=false,loading=false,preparedBody='',attachmentNeeded=false;
 const form=$('inquiryForm'),submit=$('submitInquiry');
 function status(text,error=false){$('formStatus').hidden=false;$('formStatus').textContent=text;$('formStatus').classList.toggle('error',error)}
 function codeStatus(text,error=false){$('verificationStatus').textContent=text;$('verificationStatus').classList.toggle('error',error)}
 function clearDraft(){$('emailDraftActions').hidden=true;$('openEmailDraft').removeAttribute('href');preparedBody='';attachmentNeeded=false}
 function updateButton(){submit.disabled=busy||loading||!challenge;submit.textContent=busy?(direct?'Sending…':'Preparing…'):(direct?'Send inquiry ↗':'Prepare inquiry email ↗');$('newVerificationCode').disabled=busy||loading}
 async function post(path,payload){const r=await RTC.api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});const result=await r.json();if(!r.ok)throw new Error(result.error||'This request could not be completed. Please try again.');return result}
 async function sendWeb3Forms(d){
  const payload={access_key:RTC_CONFIG.web3formsKey,subject:'RTC Fabrics inquiry — '+d.business.replace(/[\r\n]+/g,' '),from_name:'RTC Fabrics website',name:d.contactName,email:d.email,business:d.business,interest:d.interest,message:body(d)};
  const captcha=document.querySelector('textarea[name="h-captcha-response"]')?.value;if(captcha)payload['h-captcha-response']=captcha;
  const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
  const result=await r.json().catch(()=>({}));if(!r.ok||result.success===false)throw new Error(result.message||'Your inquiry could not be sent. Please try again.');return {}
 }
 async function newCode(){
  if(loading)return;loading=true;challenge=null;clearDraft();updateButton();$('verificationAnswer').value='';$('verificationCode').textContent='······';codeStatus('Loading your code…');
  try{
   if(serverVerification)challenge=await post('/api/verification',{});
   else{if(!RTC_CONFIG.draftRecipientEncoded&&!web3forms)throw new Error('Please use the connected website to send an inquiry.');const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const values=crypto.getRandomValues(new Uint8Array(6));challenge={challengeId:'preview',displayCode:Array.from(values,v=>alphabet[v%alphabet.length]).join(''),expiresIn:600,attempts:0}}
   challenge.expiresAt=Date.now()+challenge.expiresIn*1000;$('verificationCode').textContent=challenge.displayCode;$('verificationCode').setAttribute('aria-label','Verification code: '+challenge.displayCode.split('').join(' '));codeStatus('The code is valid for 10 minutes.');
  }catch(error){codeStatus(error.message||'The code could not load. Select New code to try again.',true)}finally{loading=false;updateButton()}
 }
 function render(){const list=RTC.selected(),now=new Set(list.map(p=>p.sku));for(const s of now)if(!known.has(s))selected.add(s);selected=new Set([...selected].filter(s=>now.has(s)));known=now;
  $('inquiryCollectionTitle').textContent=RTC.getCollection().name;$('selectionCount').textContent=`${selected.size} of ${list.length} fabrics selected`;$('selectAll').hidden=!list.length;
  $('inquiryItems').innerHTML=list.length?list.map(p=>`<label class="inquiry-item"><input type="checkbox" data-inquiry-sku="${esc(p.sku)}" ${selected.has(p.sku)?'checked':''}><span class="saved-image">${RTC.image(p)}</span><span><span class="sku">${esc(p.sku)}</span><h3>${esc(p.pattern)}</h3><p>${esc(p.fabrication)} · ${esc(p.width)}</p></span></label>`).join(''):'<div class="empty"><h3>No fabrics saved yet.</h3><p>Add favorites from the Digital Library, or send a general inquiry using this form.</p><a href="library.html" class="button secondary">Explore fabrics</a></div>';
 }
 function data(){return {requestId,business:$('business').value.trim(),contactName:$('contactName').value.trim(),email:$('email').value.trim(),interest:$('interest').value,message:$('message').value.trim(),website:$('website').value,consent:$('consent').checked,collectionName:RTC.getCollection().name,skus:[...selected],verification:{challengeId:challenge?.challengeId||'',code:$('verificationAnswer').value.trim().toUpperCase()}}}
 function body(d){const list=RTC.selected().filter(p=>d.skus.includes(p.sku));return ['RTC Fabrics Inquiry',`Business: ${d.business}`,`Contact: ${d.contactName}`,`Reply email: ${d.email}`,`Interest: ${d.interest}`,'',d.message,'',`Collection: ${d.collectionName}`,list.length?list.map(p=>`${p.sku} | ${p.pattern} | ${p.fabrication} | ${p.width} | ${p.putup}`).join('\n'):'General inquiry: no fabrics selected.'].join('\n')}
 function edited(){requestId=crypto.randomUUID();if(preparedBody){clearDraft();newCode();status('Your inquiry has changed. Complete the new code to prepare an updated email.')}}
 function prepareDraft(result,d){
  if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(result.recipient))throw new Error('The inquiry email is not configured correctly.');preparedBody=result.body;
  let url='mailto:'+result.recipient+'?subject='+encodeURIComponent(result.subject)+'&body='+encodeURIComponent(result.body);attachmentNeeded=url.length>1800;
  if(attachmentNeeded)url='mailto:'+result.recipient+'?subject=RTC%20Fabrics%20inquiry&body='+encodeURIComponent('Please see my attached RTC Fabrics inquiry, including my contact details and selected fabrics.');
  $('openEmailDraft').href=url;$('openEmailDraft').textContent=attachmentNeeded?'Download details & open email ↗':'Open email draft ↗';$('emailDraftActions').hidden=false;
  $('emailDraftNote').textContent=attachmentNeeded?'Your full inquiry will download as a text file. Attach it to the email draft, then press Send in your email app.':'Review your inquiry and press Send in your email app. If no email app opens, configure one on your device and try again.';
  status('Code accepted. Your email inquiry is ready to review; it has not been sent yet.');RTC.track('inquiry_email_prepared',{productCount:d.skus.length});$('openEmailDraft').focus();
 }
 $('newVerificationCode').addEventListener('click',newCode);
 $('inquiryItems').addEventListener('change',e=>{const sku=e.target.dataset.inquirySku;if(sku){e.target.checked?selected.add(sku):selected.delete(sku);edited();render()}});
 $('selectAll').addEventListener('click',()=>{selected=new Set(RTC.selected().map(p=>p.sku));edited();render()});document.addEventListener('rtc:collection',()=>{edited();render()});
 form.addEventListener('input',e=>{if(e.target.id!=='verificationAnswer')edited()});form.addEventListener('change',e=>{if(e.target.id==='interest')edited()});
 $('downloadInquiry').addEventListener('click',()=>{RTC.download('RTC_Fabrics_Inquiry.txt',preparedBody||body(data()),'text/plain');status('Inquiry downloaded for your records. A download does not send your inquiry to RTC.')});
 $('openEmailDraft').addEventListener('click',e=>{if(!preparedBody){e.preventDefault();return}if(attachmentNeeded)RTC.download('RTC_Fabrics_Inquiry.txt',preparedBody,'text/plain')});
 $('useEmailDraft').addEventListener('click',()=>{direct=false;$('useEmailDraft').hidden=true;$('deliveryNote').textContent='After the code check, open the prepared email and press Send in your email app.';newCode();status('Complete the new code to prepare your inquiry in your email app.')});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!form.reportValidity())return;const d=data();if(!d.business||!d.contactName||!d.message||d.website){status('Please complete your business name, name, and inquiry.',true);return}
  if(!challenge||Date.now()>=challenge.expiresAt){await newCode();codeStatus('The previous code expired. Enter the new code to continue.',true);return}
  if(!serverVerification&&d.verification.code!==challenge.displayCode){challenge.attempts++;if(challenge.attempts>=5)await newCode();codeStatus('The code did not match. Check the displayed code and try again.',true);$('verificationAnswer').focus();return}
  busy=true;updateButton();clearDraft();status(direct?'Sending your inquiry…':'Preparing your email inquiry…');
  try{
   if(direct){const result=web3forms?await sendWeb3Forms(d):await post('/api/inquiries',d);challenge=null;status('Your inquiry has been sent to RTC.'+(result.reference?' Reference: '+result.reference+'.':'')+' Your collection remains saved.');RTC.track('inquiry_sent',{productCount:d.skus.length});await newCode()}
   else{const result=serverVerification?await post('/api/inquiry-draft',d):{recipient:atob(RTC_CONFIG.draftRecipientEncoded),subject:'RTC Fabrics inquiry — '+d.business.replace(/[\r\n]+/g,' '),body:body(d)};challenge=null;prepareDraft(result,d);codeStatus('Code accepted. Your email draft is ready.')}
  }catch(error){status((error.message||'This request could not be completed.')+' Your entries are still here.',true);if(direct)$('useEmailDraft').hidden=false;await newCode()}finally{busy=false;updateButton()}
 });
 RTC.capabilities.then(c=>{serverVerification=!!c.verification;web3forms=!serverVerification&&!!RTC_CONFIG.web3formsKey;direct=(!!c.inquiries&&serverVerification)||web3forms;$('deliveryNote').textContent=direct?'After the code check, your inquiry and selected fabrics will be sent directly to RTC.':'After the code check, open the prepared email and press Send in your email app.';newCode()});render();
})();
