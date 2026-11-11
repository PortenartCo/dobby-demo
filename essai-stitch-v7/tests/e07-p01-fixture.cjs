const day='2026-11-12',instant='2026-11-12T12:00:00.000Z';
const recipes=[
 {id:'p01-chicken',name:'TEST — Poulet carottes et riz',emoji:'🍗',category:'Viande',minutes:35,servings:4,fav:true,ingredients:[['Poulet',400,'g'],['Carottes',300,'g'],['Riz',200,'g']],steps:['Cuire les ingrédients.'],importDetails:{version:2,key:'fixture-chicken',tags:['viande'],opaque:{preserved:true}}},
 {id:'p01-fish',name:'TEST — Poisson brocoli et pommes de terre',emoji:'🐟',category:'Poisson',minutes:25,servings:4,ingredients:[['Poisson',400,'g'],['Brocoli',300,'g'],['Pommes de terre',300,'g']],steps:['Cuire le poisson et les légumes.'],importDetails:{version:2,key:'fixture-fish',tags:['poisson','diététique'],dietary:['diet'],opaque:{preserved:true}}},
 {id:'p01-lentils',name:'TEST — Lentilles carottes et riz',emoji:'🥕',category:'Végétarien',minutes:30,servings:4,ingredients:[['Lentilles',200,'g'],['Carottes',300,'g'],['Riz',200,'g']],steps:['Cuire les lentilles et le riz.'],importDetails:{version:2,key:'fixture-lentils',tags:['végétarien','diététique'],dietary:['diet'],opaque:{preserved:true}}},
 {id:'p01-beef',name:'TEST — Bœuf courgettes et pâtes',emoji:'🍝',category:'Viande',minutes:40,servings:4,ingredients:[['Bœuf',400,'g'],['Courgettes',300,'g'],['Pâtes',200,'g']],steps:['Cuire la préparation.'],importDetails:{version:2,key:'fixture-beef',tags:['viande'],opaque:{preserved:true}}},
 {id:'p01-vegetables',name:'TEST — Carottes courgettes et riz',emoji:'🥘',category:'Végétarien',minutes:20,servings:4,ingredients:[['Carottes',300,'g'],['Courgettes',300,'g'],['Riz',200,'g']],steps:['Cuire les légumes et le riz.'],importDetails:{version:2,key:'fixture-vegetables',tags:['végétarien','diététique'],dietary:['diet'],opaque:{preserved:true}}}
];
recipes[0].filters={protein:'meat',vegetables:['carotte'],starch:'riz',dietetic:false};
recipes[1].filters={protein:'fish',vegetables:['brocoli'],starch:'pommes de terre',dietetic:true};
recipes[2].filters={protein:'vegetarian',vegetables:['carotte'],starch:'riz',dietetic:true};
recipes[3].filters={protein:'meat',vegetables:['courgette'],starch:'pâtes',dietetic:false};
recipes[4].filters={protein:'vegetarian',vegetables:['carotte','courgette'],starch:'riz',dietetic:true};
recipes.forEach(r=>r.keywords=['p01fixture']);
const members=[{id:'p01-adult-a',name:'TEST — Adulte A',birthdate:'1985-03-01'},{id:'p01-adult-b',name:'TEST — Adulte B',birthdate:'1990-08-21'},{id:'p01-child',name:'TEST — Enfant',birthdate:'2016-05-05'},{id:'p01-baby',name:'TEST — Bébé',birthdate:'2025-06-06'}];
async function seed(page){return page.evaluate(({recipes,members,day})=>DobbyCuisineEngine.evaluate(`custom=p.recipes;st.customRecipes=custom;st.familyMembers=p.members;st.day=p.day;st.slot='soir';st.adult=8;st.children=7;st.people=15;st.childFactor=.65;st.planned={
 [p.day+'-midi']:{id:'p01-chicken',adult:3,children:2,childFactor:.5,status:'prévu',note:'TEST — Note conservée',extension:{keep:true},_e072ImportRef:'TEST-native-import'},
 [p.day+'-soir']:{id:'p01-fish',adult:1,children:0,childFactor:.65,status:'prévu'},
 '2026-11-13-soir':{id:'p01-lentils',adult:2,children:1,childFactor:.65,status:'prévu'},
 '2026-11-17-midi':{id:'p01-beef',adult:2,children:1,childFactor:.75,status:'prévu',note:'TEST — Destination conservée',extension:{destination:true},_e072ImportRef:'TEST-beef-import'}
 };st.have={'Carottes|g':1000,'Riz|g':500};st.extras=['TEST — Article indépendant'];st.shopChoice={keep:true};st.shopFinal={items:[],imports:[],meals:[],e072:true};st.shopHistory={keep:{items:[{name:'TEST — Archive'}],meals:[]}};save();`,{recipes,members,day}),{recipes,members,day});}
const native=(page,code)=>page.evaluate(code=>DobbyCuisineEngine.evaluate(code),code);
const ready=page=>page.waitForFunction(()=>window.DobbyCuisine?.ready);
const open=(page,view,values={})=>page.evaluate(({view,values})=>DobbyCuisine.open(view,values),{view,values});
async function context(browser,origin,width=390){const c=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'Europe/Brussels',reducedMotion:'reduce'});await c.addInitScript(value=>{const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[value]));}static now(){return new RealDate(value).getTime();}};},instant);await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());return c;}
module.exports={day,instant,recipes,members,seed,native,ready,open,context};
