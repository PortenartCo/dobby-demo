// Historical invitation and signup UI tests exercise the pre-pilot public mode.
module.exports = (context, origin) => context.route(origin + '/essai-stitch-v7/access-config.js', async route => {
  const response = await route.fetch();
  const body = (await response.text()).replace('existingHouseholdOnly: true', 'existingHouseholdOnly: false');
  await route.fulfill({ response, body });
});
