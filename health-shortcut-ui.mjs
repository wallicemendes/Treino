import {SHORTCUT_NAME, HEALTH_ACTIVITY_TYPES, healthActivities, buildHealthPayload, shortcutUrl} from './health-shortcut.mjs';

const NAME_KEY='meu_treino_health_shortcut_name_v1';
function element(tag, text, className) {
  const node=document.createElement(tag);
  if(text !== undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
}

export function openHealthDialog(workout) {
  const activities=healthActivities(workout);
  if(!activities.length){alert('Este registro não tem atividade concluída para enviar.');return;}
  document.getElementById('healthDialog')?.remove();
  const dialog=element('dialog');dialog.id='healthDialog';dialog.setAttribute('aria-labelledby','healthDialogTitle');
  const title=element('h2','Enviar ao Saúde');title.id='healthDialogTitle';
  const form=element('form'),status=element('p','','note');status.id='healthStatus';status.setAttribute('role','status');
  const notice=element('p','No iPhone, crie primeiro o Atalho “Meu Treino Saúde”. Envie musculação e cada cardio separadamente. Confira os dados e confirme no Atalho.','note');
  const guide=element('a','Como configurar o Atalho');guide.href='./saude-iphone.txt';guide.target='_blank';guide.rel='noopener';
  function field(id,labelText,type,value='') {
    const wrap=element('div',undefined,'field'),label=element('label',labelText),input=element('input');
    label.htmlFor=id;input.id=id;input.type=type;input.value=value;wrap.append(label,input);form.append(wrap);return input;
  }
  const activityLabel=element('label','Atividade registrada');activityLabel.htmlFor='healthActivity';
  const select=element('select');select.id='healthActivity';
  for(const activity of activities){const option=element('option',activity.label);option.value=activity.key;select.append(option);}
  const activityField=element('div',undefined,'field');activityField.append(activityLabel,select);form.append(activityField);
  const typeLabel=element('label','Tipo no Saúde (confira, especialmente esteira)');typeLabel.htmlFor='healthType';
  const typeSelect=element('select');typeSelect.id='healthType';
  for(const type of HEALTH_ACTIVITY_TYPES){const option=element('option',type);option.value=type;typeSelect.append(option);}
  const typeField=element('div',undefined,'field');typeField.append(typeLabel,typeSelect);form.append(typeField);
  const date=field('healthDate','Data real de início','date',workout.date || '');date.required=true;
  const time=field('healthTime','Horário real de início','time');time.required=true;
  const minutes=field('healthMinutes','Duração real (min)','number');minutes.required=true;minutes.min='1';minutes.max='300';minutes.step='.1';
  const distance=field('healthDistance','Distância (km, opcional)','number');distance.min='0';distance.max='1000';distance.step='.01';
  const calories=field('healthCalories','Calorias ativas (kcal, opcional)','number');calories.min='0';calories.max='100000';calories.step='.1';
  let preferredName=SHORTCUT_NAME;try{preferredName=localStorage.getItem(NAME_KEY)||SHORTCUT_NAME;}catch{}
  const name=field('healthShortcutName','Nome exato do Atalho no iPhone','text',preferredName);name.required=true;name.maxLength=80;
  const checkLabel=element('label',undefined,'health-confirm'),confirmed=element('input');confirmed.type='checkbox';confirmed.id='healthConfirmed';confirmed.required=true;
  checkLabel.append(confirmed,document.createTextNode(' Conferi os dados e esta atividade ainda não foi registrada no Saúde, inclusive pelo Apple Watch.'));form.append(checkLabel);
  form.append(element('p','Informe a duração real da musculação; a ficha de 90 min não comprova o tempo realizado. Calorias do aparelho podem ser totais: só envie aqui calorias ativas conhecidas, ou deixe vazio. Nada é calculado.','note'));
  const prepare=element('button','Revisar envio','primary wide');prepare.type='submit';form.append(prepare);
  const preview=element('p','','note');preview.id='healthPreview';
  const launch=element('a','Abrir Atalho e confirmar','health-launch hidden');launch.id='healthLaunch';
  const close=element('button','Fechar','wide');close.type='button';close.onclick=()=>dialog.close();
  const handoffNotice=element('p','O app não recebe confirmação de gravação no Saúde. Ao voltar, confira o Saúde antes de enviar novamente. Seu histórico do Meu Treino permanece intacto.','note');
  dialog.append(title,notice,guide,form,preview,launch,status,handoffNotice,close);document.body.append(dialog);
  function invalidate(){launch.classList.add('hidden');launch.removeAttribute('href');preview.textContent='';status.textContent='';}
  function chooseActivity(){
    const activity=activities.find(item=>item.key===select.value);
    typeSelect.value=activity.type;minutes.value=activity.minutes??'';distance.value=activity.distance??'';calories.value=activity.calories??'';
    time.value='';confirmed.checked=false;invalidate();
  }
  form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);select.addEventListener('change',chooseActivity);
  form.onsubmit=event=>{
    event.preventDefault();invalidate();
    if(!form.reportValidity())return;
    try{
      const payload=buildHealthPayload({type:typeSelect.value,startLocal:date.value+'T'+time.value,minutes:minutes.value,distance:distance.value,calories:calories.value});
      launch.href=shortcutUrl(payload,name.value);launch.classList.remove('hidden');
      preview.textContent=payload.activityType+' • '+date.value.split('-').reverse().join('/')+' às '+time.value+' • '+payload.durationMinutes+' min'+(payload.distanceKm!==undefined?' • '+payload.distanceKm+' km':'')+(payload.caloriesKcal!==undefined?' • '+payload.caloriesKcal+' kcal':'');
      try{localStorage.setItem(NAME_KEY,name.value.trim());}catch{}
    }catch(error){status.textContent=error.message;}
  };
  launch.onclick=()=>{status.textContent='Abertura do Atalho solicitada. Confirme lá e verifique o Saúde; isto não comprova que o registro foi gravado.';};
  dialog.addEventListener('close',()=>dialog.remove());
  chooseActivity();dialog.showModal();time.focus();
}
