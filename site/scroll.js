/* Scrollable FITR narrative. All figures reuse the paper's tested numerical models. */
(function () {
  'use strict';
  const byId=id=>document.getElementById(id);
  const colors=VisualConfig.colors;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const state={input:.5,lengthscale:.1,acquisition:'EI',kernel:'SE',center:[.46,.42],storyPlaying:!reducedMotion.matches,regionPlaying:!reducedMotion.matches};
  let samples=[],predict,coreCharts={},regionChart,regionPredict,stationaryPoint;
  const visibleBoundSeries={'squared-gradient':true,'squared-bound':true,trace:true};
  const visible=new Set();
  const svgNamespace='http://www.w3.org/2000/svg';
  ScrollContent.populate();
  const compactView=matchMedia('(max-width:900px)');
  /** Collapse supporting material on phones and restore it when returning to desktop. */
  function updateResponsiveDetails(){
    document.querySelectorAll('details.mobile-details').forEach(details=>{details.open=!compactView.matches;});
  }
  updateResponsiveDetails();
  compactView.addEventListener('change',updateResponsiveDetails);

  /** Create an SVG element with safe text content and explicit attributes. */
  function element(tag,attributes={},text){const node=document.createElementNS(svgNamespace,tag);Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));if(text!==undefined)node.textContent=text;return node;}
  function format(value){if(value===0)return '0';return Math.abs(value)<.001||Math.abs(value)>=1e4?value.toExponential(0):Number(value.toPrecision(2)).toString();}
  function extent(values,padding=.08){const low=Math.min(...values),high=Math.max(...values),span=Math.max(high-low,1e-8);return [low-padding*span,high+padding*span];}
  /** Build a clipped plot and a separate selection layer; return coordinate transforms. */
  function chart(id,xDomain,yDomain,xLabel,yLabel,options={}){
    const svg=byId(id);svg.replaceChildren();
    const [,,width,height]=svg.getAttribute('viewBox').split(' ').map(Number);
    const box={left:64,right:width-(options.rightMargin??(options.secondary?70:24)),top:24,bottom:height-58};
    const x=value=>box.left+(value-xDomain[0])/(xDomain[1]-xDomain[0])*(box.right-box.left);
    const y=value=>box.bottom-(value-yDomain[0])/(yDomain[1]-yDomain[0])*(box.bottom-box.top);
    const defs=element('defs'),clip=element('clipPath',{id:id+'-clip'});clip.append(element('rect',{x:box.left,y:box.top,width:box.right-box.left,height:box.bottom-box.top}));defs.append(clip);svg.append(defs);
    for(let index=0;index<=4;index++){
      const xv=xDomain[0]+index/4*(xDomain[1]-xDomain[0]),yv=yDomain[0]+index/4*(yDomain[1]-yDomain[0]);
      svg.append(element('line',{x1:box.left,x2:box.right,y1:y(yv),y2:y(yv),class:'grid-line'}));
      if(!options.customTicks){svg.append(element('text',{x:x(xv),y:box.bottom+22,'text-anchor':'middle'},format(xv)),element('text',{x:box.left-8,y:y(yv)+4,'text-anchor':'end'},Math.abs(yv)<(yDomain[1]-yDomain[0])*.001?'0':format(yv)));}
    }
    svg.append(element('text',{x:(box.left+box.right)/2,y:height-10,'text-anchor':'middle',class:'axis-label'},xLabel),element('text',{x:17,y:(box.top+box.bottom)/2,transform:`rotate(-90 17 ${(box.top+box.bottom)/2})`,'text-anchor':'middle',class:'axis-label'},yLabel));
    const data=element('g',{'clip-path':`url(#${id}-clip)`}),selection=element('g',{'clip-path':`url(#${id}-clip)`});svg.append(data,selection);
    svg.dataset.xmin=xDomain[0];svg.dataset.xmax=xDomain[1];
    return {svg,data,selection,x,y,box,xDomain,yDomain};
  }
  /** Draw a numerical curve; SVG transforms are the only display scaling. */
  function curve(plot,points,color,dashed=false,layer=plot.data){const node=element('path',{d:points.map((point,index)=>`${index?'L':'M'}${plot.x(point[0])},${plot.y(point[1])}`).join(' '),class:'data-line',stroke:color,...(dashed?{'stroke-dasharray':'6 4'}:{})});layer.append(node);return node;}
  function point(plot,coordinates,color,radius=5,layer=plot.selection){layer.append(element('circle',{cx:plot.x(coordinates[0]),cy:plot.y(coordinates[1]),r:radius,fill:color,class:'selection-dot'}));}
  /** Fit once after a control change, then cache curves for inexpensive linked animation. */
  function rebuildCore(){
    predict=PaperModel.createPosterior(state.lengthscale);
    samples=Array.from({length:301},(_,index)=>PaperModel.evaluateAcquisition(predict(index/300),state.acquisition));
    const posterior=chart('story-model',[0,1],extent(samples.flatMap(item=>[item.mean-2*Math.sqrt(item.variance),item.mean+2*Math.sqrt(item.variance)])),'Input x','Predicted output');
    const band=[...samples.map(item=>[item.input,item.mean+2*Math.sqrt(item.variance)]),...samples.slice().reverse().map(item=>[item.input,item.mean-2*Math.sqrt(item.variance)])];
    posterior.data.append(element('path',{d:band.map((item,index)=>`${index?'L':'M'}${posterior.x(item[0])},${posterior.y(item[1])}`).join(' ')+'Z',fill:colors.indigo,opacity:.13}));
    curve(posterior,samples.map(item=>[item.input,item.mean]),colors.indigo);
    PaperModel.observations.forEach(item=>point(posterior,[item.input,item.output],colors.ink,5,posterior.data));
    const acquisition=chart('story-acquisition',[0,1],state.acquisition==='UCB'?extent(samples.map(item=>item.acquisitionValue)):[0,Math.max(...samples.map(item=>item.acquisitionValue))*1.08||1],'Input x',state.acquisition);
    curve(acquisition,samples.map(item=>[item.input,item.acquisitionValue]),colors.orange);
    const manifold=chart('story-manifold',extent(samples.map(item=>item.mean)),[0,Math.max(...samples.map(item=>item.variance))*1.08],'Predictive mean','Predictive variance');
    curve(manifold,samples.map(item=>[item.mean,item.variance]),colors.violet);
    const maximumBound=Math.max(...samples.map(item=>item.trace*item.sensitivity))*1.08||1;
    const bound=chart('story-bound',[0,1],[0,maximumBound],'Input x','Squared gradient / bound',{secondary:true,rightMargin:88});
    curve(bound,samples.map(item=>[item.input,item.gradient**2]),colors.magenta).dataset.series='squared-gradient';
    curve(bound,samples.map(item=>[item.input,item.trace*item.sensitivity]),colors.teal,true).dataset.series='squared-bound';
    const maximumTrace=Math.max(...samples.map(item=>item.trace))*1.08||1;
    // Secondary trace axis has its own units; it is not a gradient-bound curve.
    curve(bound,samples.map(item=>[item.input,item.trace/maximumTrace*maximumBound]),colors['trace-blue'],true).dataset.series='trace';
    for(const fraction of [0,.5,1])bound.svg.append(element('text',{x:bound.box.right+8,y:bound.y(fraction*maximumBound)+4,fill:colors['trace-blue']},format(fraction*maximumTrace)));
    const traceLabelX=Number(bound.svg.viewBox.baseVal.width)-20,traceLabelY=(bound.box.top+bound.box.bottom)/2;
    bound.svg.append(element('text',{x:traceLabelX,y:traceLabelY,transform:`rotate(90 ${traceLabelX} ${traceLabelY})`,'text-anchor':'middle',class:'axis-label trace-axis-label',style:'fill:var(--trace-blue)'},'Pullback trace'));
    bound.svg.dataset.quantity='squared-gradient';
    bound.svg.dataset.boundViolation=Math.max(...samples.map(item=>item.gradient**2-item.trace*item.sensitivity));
    coreCharts={posterior,acquisition,manifold,bound};renderCoreSelection();
  }
  /** Move only cursor layers while preserving the same input across all four panels. */
  function renderCoreSelection(){
    const selected=PaperModel.evaluateAcquisition(predict(state.input),state.acquisition);
    Object.values(coreCharts).forEach(plot=>plot.selection.replaceChildren());
    for(const plot of [coreCharts.posterior,coreCharts.acquisition,coreCharts.bound])plot.selection.append(element('line',{x1:plot.x(state.input),x2:plot.x(state.input),y1:plot.box.top,y2:plot.box.bottom,class:'cursor-line'}));
    point(coreCharts.posterior,[state.input,selected.mean],colors.teal,6);
    point(coreCharts.acquisition,[state.input,selected.acquisitionValue],colors.teal,6);
    point(coreCharts.manifold,[selected.mean,selected.variance],colors.teal,7);
    point(coreCharts.bound,[state.input,selected.gradient**2],colors.magenta,5);coreCharts.bound.selection.lastElementChild.dataset.series='squared-gradient';
    point(coreCharts.bound,[state.input,selected.trace*selected.sensitivity],colors.teal,5);coreCharts.bound.selection.lastElementChild.dataset.series='squared-bound';
    applyBoundVisibility();
    byId('story-input').value=state.input;
    byId('geometry').dataset.input=state.input;
  }
  /** Hide curves and their markers without changing the plotted axes. */
  function applyBoundVisibility(){byId('story-bound').querySelectorAll('[data-series]').forEach(node=>{node.style.display=visibleBoundSeries[node.dataset.series]?'':'none';});}
  document.querySelectorAll('[data-bound-series]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.boundSeries;visibleBoundSeries[key]=!visibleBoundSeries[key];button.setAttribute('aria-pressed',String(visibleBoundSeries[key]));applyBoundVisibility();}));
  /** Plot the existing matched posterior-trace experiments on logarithmic axes. */
  function renderTraceComparison(){
    const data=PaperModel.computeTraceComparison();
    const groups=[{id:'trace-local',curves:[['global',colors.orange],['local',colors.teal]]},{id:'trace-scaling',curves:[['global',colors.orange],['subcritical',colors.magenta],['critical',colors.indigo],['supercritical',colors.violet]]}];
    for(const group of groups){
      const plot=chart(group.id,[1,8],[-7,2],'Input dimension','Mean pullback trace',{customTicks:true});
      for(const dimension of [2,8,32,128,256])plot.svg.append(element('text',{x:plot.x(Math.log2(dimension)),y:plot.box.bottom+22,'text-anchor':'middle'},dimension));
      for(const power of [-7,-4,-1,2])plot.svg.append(element('text',{x:plot.box.left-8,y:plot.y(power)+4,'text-anchor':'end'},power===-7?'\u22641e-7':`1e${power}`));
      group.curves.forEach(([key,color])=>{const values=data.map(item=>[Math.log2(item.dimension),Math.max(-7,Math.log10(Math.max(item[key],1e-300)))]);curve(plot,values,color);values.forEach(value=>point(plot,value,color,3,plot.data));});
    }
  }
  /** Compare actual mean/variance gradient directions at two inputs of one GP. */
  function renderCancellation(){
    const predictor=PaperModel.createStationaryExample2D();
    if(!stationaryPoint)stationaryPoint=PaperModel.findStationaryPoints2D(predictor,'EI').find(item=>item.branch==='cancellation'&&item.stationaryType==='maximum');
    const svg=byId('cancellation');svg.replaceChildren();
    if(!stationaryPoint){svg.append(element('text',{x:35,y:160},'No interior cancellation point found.'));return;}
    const ordinaryPoint=PaperModel.evaluatePoint2D(predictor(.70,.30),'EI');
    const arrow=(center,gradient,color)=>{
      // Normalize each arrow for a direction-only comparison; magnitude is not encoded.
      const norm=Math.hypot(...gradient),dx=100*gradient[0]/norm,dy=-100*gradient[1]/norm;
      const ux=dx/100,uy=dy/100,end=[center[0]+dx,center[1]+dy];
      svg.append(element('path',{d:`M${center} L${end} M${end[0]-10*ux+5*uy},${end[1]-10*uy-5*ux} L${end} L${end[0]-10*ux-5*uy},${end[1]-10*uy+5*ux}`,fill:'none',stroke:color,'stroke-width':3}));
    };
    for(const [center,model,title,isStationary] of [[[170,170],ordinaryPoint,'Non-stationary point',false],[[510,170],stationaryPoint,'Stationary point',true]]){
      svg.append(element('text',{x:center[0],y:28,'text-anchor':'middle'},title),element('line',{x1:center[0]-125,x2:center[0]+125,y1:170,y2:170,class:'grid-line'}),element('line',{x1:center[0],x2:center[0],y1:48,y2:292,class:'grid-line'}),element('text',{x:center[0]+126,y:187,class:'axis-label'},'x\u2081'),element('text',{x:center[0]+9,y:54,class:'axis-label'},'x\u2082'));
      arrow(center,model.meanGradient,colors.indigo);arrow(center,model.varianceGradient,colors.violet);
      svg.append(element('circle',{cx:center[0],cy:center[1],r:4,fill:colors.ink}));
      if(model.gradientNorm>1e-8){
        arrow(center,model.gradient,colors.orange);
        svg.lastElementChild.dataset.gradient='acquisition';
      }else{
        svg.append(element('circle',{cx:center[0],cy:center[1],r:6,fill:colors.orange,'data-gradient':'acquisition-zero'}));
      }
      const label=element('foreignObject',{x:center[0]-140,y:303,width:280,height:40});
      const labelText=document.createElementNS('http://www.w3.org/1999/xhtml','div');
      labelText.style.cssText='text-align:center;font-size:17px';
      labelText.innerHTML=PaperNotation.inline(String.raw`\nabla_{\cusvector{\inpvars}}\acqf(\cusvector{\inpvars})`+(isStationary?String.raw`\approx\cusvector{0}`:String.raw`\neq\cusvector{0}`));
      label.append(labelText);svg.append(label);
    }
    const model=stationaryPoint,meanNorm=Math.hypot(...model.meanGradient),varianceNorm=Math.hypot(...model.varianceGradient);
    svg.dataset.trace=model.trace;svg.dataset.gradientSquared=model.gradientNormSquared;
    svg.dataset.quotient=model.gradientNormSquared/model.uNormSquared;svg.dataset.minimum=model.eigenvalues[0];svg.dataset.maximum=model.eigenvalues[1];
    svg.dataset.gradientCosine=(model.meanGradient[0]*model.varianceGradient[0]+model.meanGradient[1]*model.varianceGradient[1])/(meanNorm*varianceNorm);
    svg.dataset.contributionResidual=Math.hypot(...model.meanGradient.map((value,index)=>model.meanSensitivity*value+model.varianceSensitivity*model.varianceGradient[index]));
    svg.dataset.nonstationaryGradientSquared=ordinaryPoint.gradientNormSquared;
  }
  /** Prepare a predictive-variance background and the correct surrogate comparison. */
  function rebuildRegion(){
    regionPredict=PaperModel.createPosterior2D(.18,.30,state.kernel);
    regionChart=chart('trust-region',[0,1],[0,1],'Input coordinate 1','Input coordinate 2',{secondary:true});
    const samples=[];
    for(let row=0;row<32;row++)for(let column=0;column<32;column++){const x=(column+.5)/32,y=1-(row+.5)/32;samples.push({row,column,variance:regionPredict(x,y).variance});}
    const low=Math.min(...samples.map(item=>item.variance)),high=Math.max(...samples.map(item=>item.variance)),stops=VisualConfig.fieldPalettes.variance;
    samples.forEach(item=>{const fraction=(item.variance-low)/(high-low||1);regionChart.data.append(element('rect',{x:regionChart.box.left+item.column*(regionChart.box.right-regionChart.box.left)/32,y:regionChart.box.top+item.row*(regionChart.box.bottom-regionChart.box.top)/32,width:(regionChart.box.right-regionChart.box.left)/32+.5,height:(regionChart.box.bottom-regionChart.box.top)/32+.5,fill:`rgb(${stops[0].map((value,index)=>Math.round(value+fraction*(stops[1][index]-value))).join(',')})`,opacity:.65}));});
    for(let step=0;step<36;step++){const fraction=1-step/35;regionChart.svg.append(element('rect',{x:regionChart.box.right+10,y:regionChart.box.top+step*(regionChart.box.bottom-regionChart.box.top)/36,width:10,height:(regionChart.box.bottom-regionChart.box.top)/36+.3,fill:`rgb(${stops[0].map((value,index)=>Math.round(value+fraction*(stops[1][index]-value))).join(',')})`,opacity:.65}));}
    regionChart.svg.append(element('text',{x:regionChart.box.right+6,y:15},'Variance'),element('text',{x:regionChart.box.right+23,y:regionChart.box.top+6},format(high)),element('text',{x:regionChart.box.right+23,y:regionChart.box.bottom},format(low)));
    regionPredict.observations.forEach(item=>point(regionChart,item.input,colors.ink,4,regionChart.data));
    byId('region-subtitle').textContent=state.kernel==='SE'?'GP with SE kernel: TuRBO versus FITR':'GP with IBNN kernel: weights from local geometry';
    const entries=[['FITR',colors.violet],...(state.kernel==='SE'?[['TuRBO',colors.orange]]:[])];
    byId('region-legend').replaceChildren(...entries.map(([label,color])=>{const span=document.createElement('span');span.className='legend-key';span.style.setProperty('--legend-color',color);span.textContent=label;return span;}));

    renderRegion();
  }
  /** Update the exact-diagonal FITR region at a moving illustration center. */
  function renderRegion(){
    const pointState=PaperModel.evaluatePoint2D(regionPredict(...state.center),'EI');
    const region=PaperModel.computeFitrRegion2D(pointState,.18,.30,.3,16);
    regionChart.selection.replaceChildren();
    const box=(bounds,color,dashed)=>regionChart.selection.append(element('rect',{x:regionChart.x(bounds[0][0]),y:regionChart.y(bounds[1][1]),width:regionChart.x(bounds[0][1])-regionChart.x(bounds[0][0]),height:regionChart.y(bounds[1][0])-regionChart.y(bounds[1][1]),stroke:color,'stroke-width':3,fill:'none',...(dashed?{'stroke-dasharray':'6 4'}:{})}));
    if(state.kernel==='SE')box(region.turboBox,colors.orange,true);
    box(region.fitrBox,colors.violet,false);point(regionChart,state.center,colors.teal,6);
    regionChart.svg.dataset.weightProduct=region.fitrWeights[0]*region.fitrWeights[1];
    regionChart.svg.dataset.kernel=state.kernel;regionChart.svg.dataset.center=state.center.join(',');
  }
  /** Show both verified benchmark summaries independently of the illustration selector. */
  function initializeResults(){
    const section=byId('fitr-results');
    section.innerHTML='<h3>Results from the paper</h3><p>Final best observed value, mean \u00b1 standard error; lower is better. Bold FITR values and percentages indicate improvement over the baseline in each table.</p>';
    const formatStatistics=statistics=>statistics.mean.toFixed(2)+' \u00b1 '+statistics.se.toFixed(2);
    const comparisons=[
      {id:'fitr-results-se',title:'GP with SE kernel',plot:'figures/results-se.svg',baseline:'TuRBO',rows:PaperModel.benchmarkSummary.map(result=>({problem:result.problem,baseline:result.turbo,fitr:result.fitr,improvement:result.improvement}))},
      {id:'fitr-results-ibnn',title:'GP with IBNN kernel',plot:'figures/results-ibnn.svg',baseline:'Global BO (without FITR)',rows:PaperResults.ibnnResults.map(result=>({problem:result.problem,baseline:formatStatistics(result.baseline),fitr:formatStatistics(result.fitr),improvement:result.improvement}))}
    ];
    for(const comparison of comparisons){
      const tableSection=document.createElement('section');tableSection.id=comparison.id;
      tableSection.innerHTML=`<h3>${comparison.title}</h3><div class="benchmark-comparison"><figure class="paper-results-plot"><img src="${comparison.plot}" alt="Paper benchmark curves for ${comparison.title}: best observed value versus number of evaluations, with standard-error bands."></figure><div class="fitr-table-scroll"><table><thead><tr><th>Problem</th><th>${comparison.baseline}</th><th>FITR</th><th>Improvement (%)</th></tr></thead><tbody></tbody></table></div></div>`;
      const body=tableSection.querySelector('tbody');
      for(const result of comparison.rows){
        const row=document.createElement('tr');if(result.improvement>0)row.className='fitr-better';
        [result.problem,result.baseline,result.fitr,(result.improvement>0?'+':'')+result.improvement.toFixed(2)].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell);});body.append(row);
      }
      section.append(tableSection);
    }
  }
  function updatePlayback(){for(const [id,playing] of [['story-pause',state.storyPlaying],['region-pause',state.regionPlaying]]){byId(id).textContent=reducedMotion.matches?'Step illustration':playing?'Pause animation':'Resume animation';byId(id).setAttribute('aria-pressed',String(playing));}}
  byId('story-input').addEventListener('input',event=>{state.storyPlaying=false;state.input=Number(event.target.value);renderCoreSelection();updatePlayback();});
  byId('story-kind').addEventListener('change',event=>{state.acquisition=event.target.value;rebuildCore();});
  byId('story-lengthscale').addEventListener('input',event=>{state.lengthscale=Number(event.target.value);byId('story-lengthscale-value').textContent=state.lengthscale.toFixed(2);rebuildCore();});
  byId('story-pause').addEventListener('click',()=>{if(reducedMotion.matches){state.input=(state.input+.15)%1;renderCoreSelection();return;}state.storyPlaying=!state.storyPlaying;updatePlayback();});
  byId('region-pause').addEventListener('click',()=>{if(reducedMotion.matches){state.center=[.15+(state.center[0]+.12)%.7,.15+(state.center[1]+.08)%.7];renderRegion();return;}state.regionPlaying=!state.regionPlaying;updatePlayback();});
  byId('region-kernel').addEventListener('change',event=>{state.kernel=event.target.value;rebuildRegion();});
  byId('trust-region').addEventListener('pointerdown',event=>{const cursor=new DOMPoint(event.clientX,event.clientY).matrixTransform(regionChart.svg.getScreenCTM().inverse());state.center=[Math.max(0,Math.min(1,(cursor.x-regionChart.box.left)/(regionChart.box.right-regionChart.box.left))),Math.max(0,Math.min(1,(regionChart.box.bottom-cursor.y)/(regionChart.box.bottom-regionChart.box.top)))];state.regionPlaying=false;renderRegion();updatePlayback();});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){state.storyPlaying=false;state.regionPlaying=false;updatePlayback();}});
  rebuildCore();renderTraceComparison();renderCancellation();initializeResults();rebuildRegion();updatePlayback();
  /** Match HTML legends to the visible SVG label size, including viewBox scaling. */
  function synchronizeLegendSize(plot){
    const axisLabel=plot.querySelector('.axis-label'),transform=plot.getScreenCTM();
    if(!axisLabel||!transform)return;
    const renderedSize=parseFloat(getComputedStyle(axisLabel).fontSize)*Math.hypot(transform.a,transform.b);
    plot.closest('.plot-card').style.setProperty('--rendered-axis-label-size',renderedSize+'px');
  }
  const legendSizeObserver=new ResizeObserver(entries=>entries.forEach(entry=>synchronizeLegendSize(entry.target)));
  document.querySelectorAll('.plot-card>svg').forEach(plot=>{synchronizeLegendSize(plot);legendSizeObserver.observe(plot);});
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.dataset.inView=String(entry.isIntersecting);if(entry.isIntersecting)visible.add(entry.target.id);else visible.delete(entry.target.id);}),{threshold:.05});
  ['geometry','fitr'].forEach(id=>observer.observe(byId(id)));
  let lastFrame=0,scanDirection=1,regionPhase=0;
  /** Animate only visible illustrations; the manuscript remains readable without playback. */
  function animate(time){
    if(time-lastFrame>45&&!document.hidden){
      const elapsed=Math.min(100,time-lastFrame)/1000;
      if(visible.has('geometry')&&state.storyPlaying&&!reducedMotion.matches){state.input+=scanDirection*elapsed*.06;if(state.input>=1||state.input<=0){state.input=Math.max(0,Math.min(1,state.input));scanDirection*=-1;}renderCoreSelection();}
      if(visible.has('fitr')&&state.regionPlaying&&!reducedMotion.matches){regionPhase+=elapsed;const target=[.5+.28*Math.sin(regionPhase/7.8),.5+.28*Math.sin(regionPhase/10.7+.8)];state.center=state.center.map((value,index)=>value+elapsed*.5*(target[index]-value));renderRegion();}
      lastFrame=time;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  // Preserve old incoming links while making scrolling the only navigation model.
  const legacy=new URLSearchParams(location.search).get('scene');
  const legacyAnchors={'0':'geometry','1':'geometry','2':'geometry','3':'high-dimensional','4':'stationary','5':'fitr','6':'fitr'};
  const initialAnchor=location.hash.slice(1)||legacyAnchors[legacy]||(document.body.dataset.experience==='fitr-scroll'?'fitr':'');
  if(initialAnchor&&!location.hash)setTimeout(()=>byId(initialAnchor)?.scrollIntoView({behavior:'instant'}),0);
  document.documentElement.dataset.ready='true';
})();
