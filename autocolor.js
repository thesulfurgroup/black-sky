/*SM AUTOCOLOR V2 | Use Site Styles color palette in CSS*/
document.addEventListener('DOMContentLoaded',function(){
var themeVariablePairs=[
{theme:'white',variable:'--white',fallback:'--white-hsl',class:'white'},
{theme:'white-bold',variable:'--white-bold',fallback:'--white-hsl',class:'white-bold'},
{theme:'light',variable:'--light',fallback:'--lightAccent-hsl',class:'light'},
{theme:'light-bold',variable:'--light-bold',fallback:'--lightAccent-hsl',class:'light-bold'},
{theme:'bright',variable:'--accent',fallback:'--accent-hsl',class:'bright'},
{theme:'bright-inverse',variable:'--accent-bold',fallback:'--accent-hsl',class:'bright-inverse'},
{theme:'dark',variable:'--dark',fallback:'--darkAccent-hsl',class:'dark'},
{theme:'dark-bold',variable:'--dark-bold',fallback:'--darkAccent-hsl',class:'dark-bold'},
{theme:'black',variable:'--black',fallback:'--black-hsl',class:'black'},
{theme:'black-bold',variable:'--black-bold',fallback:'--black-hsl',class:'black-bold'}];
themeVariablePairs.forEach(function(pair){
var selector='[data-section-theme="'+pair.theme+'"]';
var element=document.querySelector(selector);
if(!element){
selector='.'+pair.class;
element=document.querySelector(selector);}
if(element){
var siteBackgroundColor=getComputedStyle(element).getPropertyValue('--siteBackgroundColor').trim();
if(siteBackgroundColor){
document.documentElement.style.setProperty(pair.variable,siteBackgroundColor);
}else{
document.documentElement.style.setProperty(pair.variable,'var('+pair.fallback+')');}
}else{
document.documentElement.style.setProperty(pair.variable,'var('+pair.fallback+')');}
});
});
