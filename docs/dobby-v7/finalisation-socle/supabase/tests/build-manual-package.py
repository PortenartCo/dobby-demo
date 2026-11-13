#!/usr/bin/env python3
"""Assemble reviewed manual SQL files without intermediate transactions.

This tool only writes local artifacts. It never executes SQL or connects to
Supabase. Original sources remain separate; their hashes accompany the package.
"""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parents[3]
SHOPPING = HERE.parents[1] / 'revue-generale/supabase/shopping'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
dest = args.output.resolve()
assert not dest.is_relative_to(REPO), 'Generated intervention artifacts stay outside the public source tree'
dest.mkdir(parents=True, exist_ok=True)
sources = {}


def read(path):
    sources[str(path.relative_to(REPO))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return path.read_text()


def unwrap(path, readonly=False):
    text = read(path)
    begin = r'(?m)^BEGIN(?: TRANSACTION)?(?: ISOLATION LEVEL REPEATABLE READ)?(?: READ ONLY)?;[ \t]*\n'
    end = r'(?m)^(?:COMMIT|ROLLBACK);[ \t]*(?:\n|$)'
    assert len(re.findall(begin, text)) == 1, path
    assert len(re.findall(end, text)) == 1, path
    if readonly:
        assert re.search(r'(?m)^BEGIN(?: TRANSACTION)?(?: ISOLATION LEVEL REPEATABLE READ)? READ ONLY;', text), path
    return re.sub(end, '', re.sub(begin, '', text)).strip()


def comment(path):
    return '\n-- SOURCE ' + str(path.relative_to(REPO)) + '\n'


install_sources = [HERE / 'family/01-install-family.sql', HERE / 'missions/01-apply.sql', SHOPPING / '01-install.sql']
install = '''-- DOBBY V7 — lot familial, Missions V3 et disponibilité Courses.
-- MANUEL, seul projet dobby-family-sync. Aucune valeur à remplacer.
-- Ne pas rejouer les anciens scripts Stitch 01/04/06/11.
-- Une transaction pour les trois évolutions : tout échec avant COMMIT annule
-- ce lot complet. Storage a sa propre étape 11 et sa propre vérification.
-- Aucun reset de compte/foyer, aucun recalcul ou effacement du ledger.
-- Aucun flag de preuve ni capacité cliente n'est activé par ce fichier.
BEGIN;
'''
for source in install_sources:
    install += comment(source) + unwrap(source) + '\n'
install += '''
SELECT jsonb_build_object('installation','dobby-v7-family-core-manual-v1',
 'familyInstalled',true,'missionsV3Installed',true,'availabilityColumnInstalled',true,
 'storageSeparateStepRequired',true,'clientProofFlagsOpen',false,
 'noAccountOrHouseholdReset',true,'noHistoricalLedgerRewrite',true,
 'realAuthRlsRpcOrBrowserVerified',false) AS socle_installation;
COMMIT;
'''
(dest / '10-install-socle.sql').write_text(install)
(dest / '11-install-storage.sql').write_text(read(HERE / 'family/03-install-storage-policies.sql'))

verification_sources = {
    'family': HERE / 'family/02-verify-family.sql',
    'missions': HERE / 'missions/02-verify.sql',
    'shopping': HERE / 'shopping/04-verify-catalog.sql',
    'storage': HERE / 'family/04-verify-storage.sql',
}
verification = '''-- MANUEL, projet familial uniquement. Catalogue en LECTURE SEULE.
-- Une seule cellule finale socle_verification ; aucune ligne métier lue.
-- Tous les champs de preuve réelle restent false avant recette correspondante.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
'''
# Reuse the original shopping verification as well as the stronger catalog check.
verification += comment(SHOPPING / '02-verify.sql') + unwrap(SHOPPING / '02-verify.sql', readonly=True) + '\n'
verification += "SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(\n 'verification','dobby-v7-family-core-manual-v1',\n 'readOnly',pg_catalog.current_setting('transaction_read_only')='on',\n 'noAccountOrHouseholdReset',true,\n 'realAuthRlsRpcOrBrowserVerified',false,\n"
parts = []
for name, source in verification_sources.items():
    query = unwrap(source, readonly=True).strip().removesuffix(';')
    parts.append(" '" + name + "', (\n" + query + '\n )::jsonb')
verification += ',\n'.join(parts) + '\n)) AS socle_verification;\nROLLBACK;\n'
(dest / '20-verify-socle.sql').write_text(verification)

rollback = '''-- RETOUR CONSERVATEUR, jamais une étape normale d'installation.
-- MANUEL, seul projet familial. Suspend les nouveaux accès et ferme les flags.
-- Conserve tous les comptes, liens, profils, crédits, reçus, disponibilité et RLS.
-- Les Missions déjà V3 restent consultables ; aucun ancien writer incompatible.
-- Ce fichier ne retire PAS les protections Storage et ne restaure PAS l'owner V7.
BEGIN;
'''
for source in [HERE / 'family/05-rollback-suspend.sql', HERE / 'missions/03-rollback-conservative.sql', SHOPPING / '03-rollback.sql']:
    rollback += comment(source) + unwrap(source) + '\n'
rollback += "SELECT jsonb_build_object('rollback','dobby-v7-family-core-conservative-v1','clientFlagsClosed',true,'historicalDataAndPermissionsRetained',true) AS socle_rollback;\nCOMMIT;\n"
(dest / '90-rollback-suspend.sql').write_text(rollback)

notice = '''# DOBBY V7 — intervention manuelle du socle familial

Projet unique : **dobby-family-sync**. Aucune valeur à remplacer. Ne pas rejouer
Stitch 01/04/06/11, aucun reset ni recréation de compte ou foyer.

1. SQL Editor du projet familial : exécuter TOUT `10-install-socle.sql` UNE fois.
   Attendre `socle_installation`. Toute erreur annule cette transaction complète :
   exécuter `ROLLBACK;`, transmettre l'erreur et ne pas forcer/rejouer. Si le lot est déjà présent,
   demander sa vérification plutôt qu'une réinstallation.
2. Si 10 réussit, exécuter `11-install-storage.sql`. C'est une transaction séparée.
   En cas de `42501` / « must be owner », transmettre l'erreur : les cinq policies
   de ce fichier ne sont pas appliquées. Exécuter `ROLLBACK;` pour libérer une
   éventuelle session en erreur, puis passer à 20. Ne changer ni owner, ni RLS, ni rôle géré.
   Le lot 10 réussi reste installé, avec les capacités clientes fermées.
3. Exécuter `20-verify-socle.sql`, puis transmettre la cellule finale complète
   `socle_verification` et l'éventuelle erreur de 11 dans la conversation privée.
   Aucun contenu familial, mot de passe, clé ou jeton d'invitation n'est demandé.

`90-rollback-suspend.sql` est un retour conservateur EN CAS DE BESOIN SEULEMENT.
Il ne supprime pas les données ni les protections. Ne pas l'exécuter après une
installation réussie pour « finir ». Il n'active aucune capacité.

Les flags et release gates restent fermés. Le succès SQL et les métadonnées ne
prouvent pas Auth/RLS/RPC réels ou les nouveaux parcours : les recettes ciblées
restent nécessaires avant toute activation. Aucun SQL d'activation aveugle ici.

Le manifeste donne les empreintes des sources et des fichiers exacts. Les tests
locaux emploient le modèle réel avec données fictives ; aucune opération distante
par l'agent. Les retours techniques bruts restent privés, hors Git/PR public.
'''
(dest / 'LIRE-AVANT-EXECUTION.md').write_text(notice)
manifest = {
    'package': 'dobby-v7-family-core-manual-v1',
    'remoteSqlExecutedByBuilder': False,
    'clientReleaseGatesOpen': False,
    'sourceSha256': sources,
    'filesSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dest.iterdir()) if p.suffix in ('.sql', '.md')},
}
(dest / 'MANIFEST.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
archive = dest / 'DOBBY_V7_INSTALLATION_SOCLE_20261113.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in [*manifest['filesSha256'], 'MANIFEST.json']:
        z.write(dest / name, name)
print(archive)
