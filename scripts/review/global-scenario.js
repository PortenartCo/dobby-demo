/* Public, fictional inputs for the launch review. Also exported to its data manifest. */
'use strict';
(() => {
  const scenario = {
    version: 1,
    namespace: 'dobby-review-v7-launch-v1|',
    day: '2026-11-27',
    calendar: 'La date du premier démarrage est conservée à chaque réinitialisation.',
    household: { id: '00000000-0000-4000-8000-000000000010', name: 'DÉMO — Les Lanternes' },
    profiles: [
      { code: 'A', memberId: 'review-person', userId: '00000000-0000-4000-8000-000000000001', role: 'parent', firstName: 'Camille', avatar: '🧙', houseId: 'hufflepuff', patronusId: 'otter', avatarId: 'portrait-3' },
      { code: 'B', memberId: 'review-person-b', userId: '00000000-0000-4000-8000-000000000002', role: 'parent', firstName: 'Alex', avatar: '🦊', houseId: 'ravenclaw', patronusId: 'lynx', avatarId: 'portrait-2' },
      { code: 'C', memberId: 'review-enfant-c', userId: '00000000-0000-4000-8000-000000000003', role: 'child', firstName: 'Lou', avatar: '🦉', houseId: 'hufflepuff', patronusId: 'fox', avatarId: 'portrait-5' },
      { code: 'D', memberId: 'review-enfant-d', userId: '00000000-0000-4000-8000-000000000004', role: 'child', firstName: 'Maël', avatar: '🐉', houseId: 'gryffindor', patronusId: 'hare', avatarId: 'portrait-6' },
    ],
    missions: [
      { id: 'review-mission-c', assigneeId: 'review-enfant-c', title: 'DÉMO — Préparer le coin lecture', category: 'Famille', effort: 'regular' },
      { id: 'review-mission-d', assigneeId: 'review-enfant-d', title: 'DÉMO — Arroser les plantes', category: 'Maison', effort: 'light' },
    ],
    goal: { id: '00000000-0000-4000-8000-000000000111', memberId: 'review-enfant-c', threshold: 25, title: 'Choisir le jeu de la soirée' },
    grocery: [
      { id: '00000000-0000-4000-8000-000000000100', title: 'Carottes', quantity: 500, unit: 'g' },
      { id: '00000000-0000-4000-8000-000000000101', title: 'Pommes de terre', quantity: 1, unit: 'kg' },
      { id: '00000000-0000-4000-8000-000000000102', title: 'Crème', quantity: 200, unit: 'ml' },
    ],
    equipment: { id: 'review-equipment', name: 'DÉMO — Four du Logis', category: 'Électroménager', place: 'Cuisine', brand: 'Atelier fictif', model: 'Lanterne', maintenancePlans: [{ id: 'review-plan-four', title: 'Vérifier le joint de la porte', interval: { value: 6, unit: 'months' } }] },
    contact: { id: 'review-contact', name: 'DÉMO — Atelier familial', role: 'Entretien du foyer', note: 'Contact fictif, sans coordonnées.' },
    inherited: {
      recipeIds: ['review-soup', 'review-gratin'], meals: ['midi', 'soir'],
      missionIds: ['review-mission', 'review-mission-b'], contractIds: ['review-insurance', 'review-contract'], eventIds: ['review-event'],
      source: 'scripts/review/global-config.js',
    },
    health: {
      activation: 'unavailable',
      examples: [{ memberId: 'review-enfant-c', title: 'Contrôle de routine fictif', note: 'Rappel de démonstration. Exemple de rendez-vous uniquement.' }],
    },
    recipeStatus: 'Deux recettes pilotes du scénario. Le catalogue complet de 400 recettes reste hors du périmètre de ce rejeu.',
  };
  for (const profile of scenario.profiles) {
    profile.name = `${profile.firstName} Démo`;
    profile.email = `client-${profile.code.toLowerCase()}@fictional.example.test`;
    Object.freeze(profile);
  }
  Object.freeze(scenario.profiles);
  Object.freeze(scenario);
  if (typeof module === 'object' && module.exports) module.exports = scenario;
  else {
    window.DobbyGlobalLaunch = true;
    window.DobbyGlobalScenario = scenario;
  }
})();
