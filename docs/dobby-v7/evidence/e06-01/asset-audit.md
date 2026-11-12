# E06-01 — audit de l’illustration et de la provenance

Audit en lecture seule le 11 novembre 2026. Aucune modification produit.

## Sources reçues

ZIP reçu : `DOBBY-E06-RITUEL-SOURCE-STITCH.zip`, 472559 octets, SHA256 `b12892685c1db0872d169022d098721af98007e3d54ab4993d4fd91d99d01e15`.

Les empreintes code.html, screen.png et DESIGN.md correspondent au SOURCE-MANIFEST fourni :

- code.html : `4e49be83d86f00d0ea267f58332d73012373807b4e65964b549e7797249f4054`
- screen.png : `07ec242865e67959f4487b4a99dcb3bff7b1a87bd3acb158a728f5740a3bf65d`
- DESIGN.md : `6db2e022f83a3f57c0e1249a9a0aa73e9213a1939ceda9172267a727b304e4db`
- SOURCE-MANIFEST.md lui-même : `7e720d09a7d0ea88d3480a2108fd3d5f1ab4073c559645ae404b87b659aeeb38`

La SHA d’archive `a029b454...` indiquée par le manifeste fourni ne correspond pas à ce nouveau ZIP ; la conserver comme référence historique sans modifier le manifeste fourni, et inventorier l’archive reçue séparément.

## Ressource externe du Rituel

URL exacte :
`https://lh3.googleusercontent.com/aida/ALJJyrBuAD71LOH_aocipnklzFwV6d16q41gsHVKbW6qM5buyOIP_58NNrY80yZmHsv76xYLObcnGODF2O8-1hH48Z5LKBk5AhLbafqxOboGIlL2ZrkXnrMAEvB41P9Hor2D2YKrVMEExj5q6SIkNxCAPmh8vef7KJEzLXuCg_GlhE36pNOgqR0Brj9-nAZM_OKUx_xn28h3t7SGwdFI3e6P7GxQgD0yEIM5SejsL5i80cefSw`

Vérification HTTP : réponse 200, `Content-Type: text/html; charset=utf-8`, 948360 octets lors du contrôle, début `<!doctype html><html`. Ce n’est pas une image exploitable par `<img>`. Aucun fichier image ni licence de redistribution de cette ressource nouvelle n’est établi. Elle ne doit pas être incorporée ou présentée comme récupérée.

La capture `screen.png` fournie contient déjà l’icône d’image cassée et son texte alternatif à la place de l’illustration. Elle ne contient donc pas une illustration centrale cachée à extraire. Ne pas réutiliser cette capture comme faux décor.

## Repli local recommandé

`essai-stitch-v7/assets/remaining/41e997ebd3dbb0da.png`, 512 × 286 px. SHA256 :
`2d81b25fb96c0b076b4023505baad42afcac5bd5fd36ecf55e3356a821480451`.

Illustration réellement inspectée : Dobby au centre, grande cheminée de pierre et feu à gauche, bibliothèque et lumières chaudes. Il s’agit d’une vraie illustration autonome, pas d’une capture d’écran complète.

Provenance cataloguée : `essai-stitch-v7/assets/remaining/provenance.json` ; source Google aida-public différente de celle du Rituel. Déjà utilisée par `templates/remaining/chat.html`, documentée comme asset Stitch original E02 dans `docs/dobby-v7/E02-PARLER-A-DOBBY.md`, et déjà couverte opérationnellement par la publication de démonstration E02 autorisée décrite dans ce contrat. Aucune nouvelle ressource externe n’est nécessaire. Cette réutilisation n’établit pas une licence générale indépendante ; la provenance doit dire explicitement « illustration locale E02 réutilisée, remplacement du média externe Rituel inexploitable ».

Cadrage : image paysage. Un object-cover dans la haute scène portrait couperait la cheminée et une partie de Dobby. Préférer contain dans le centre de la scène avec un fond chaud/lueurs CSS ; éventuellement une duplication floutée du même asset en arrière-plan pour remplir sans perdre la vraie illustration. Conserver les éléments structurels Stitch (scène, badge, panneau doré, commandes et transition verte).

Animation : les émissions du canvas source sont centrées, alors que le foyer du repli local se trouve vers 20% × 67% de l’image. Adapter leur point focal au rectangle réellement affiché de l’image pour éviter des flammes sur Dobby. Aucun exemple fictif de compte ni fausse promesse de « chiffrement hermétique » ne doit être repris comme capacité réelle.

## Conclusion

Source HTML utilisable et conservable fidèlement. Média central d’origine inexploitable ; repli local de qualité disponible et déjà présent dans l’application, avec provenance explicite requise. Contrôler à 320/390/1440 que Dobby et le foyer restent visibles, que l’image est décodée et que le canvas ne masque pas le personnage.
