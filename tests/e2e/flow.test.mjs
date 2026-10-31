import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROJECT, QUOTE_VERSION, registerFamily, registerSpecialist } from './helpers.mjs';

test('una familia y un especialista completan la obra de punta a punta', async () => {
  const family = await registerFamily();
  const specialist = await registerSpecialist();
  const rival = await registerSpecialist('Arq. Rival');

  const project = await family.ok('POST', 'marketplace/projects', PROJECT);
  assert.equal(project.status, 'open');

  const candidates = await family.ok('GET', `marketplace/projects/${project.id}/candidates`);
  const card = candidates.find((item) => item.id === specialist.id);
  assert.ok(card, 'el especialista cercano aparece como candidato');
  assert.ok(card.affinity > 50);
  assert.equal('phone' in card, false, 'el celular no se expone antes del match');

  const firstLike = await family.ok('POST', 'marketplace/swipes/family', {
    projectId: project.id,
    specialistId: specialist.id,
    decision: 'like',
  });
  assert.equal(firstLike.matched, false, 'un solo interés no es match');

  const feed = await specialist.ok('GET', 'marketplace/feed');
  const slide = feed.find((item) => item.id === project.id);
  assert.equal(slide.invited, true);
  assert.equal('address' in slide, false, 'la dirección no se expone antes del match');

  const mutual = await specialist.ok('POST', 'marketplace/swipes/specialist', {
    projectId: project.id,
    decision: 'like',
  });
  assert.equal(mutual.matched, true);

  await family.ok('POST', 'marketplace/swipes/family', {
    projectId: project.id,
    specialistId: rival.id,
    decision: 'like',
  });
  const rivalMatch = await rival.ok('POST', 'marketplace/swipes/specialist', {
    projectId: project.id,
    decision: 'like',
  });

  const match = await specialist.ok('GET', `marketplace/matches/${mutual.matchId}`);
  assert.equal(match.address, 'Av. Primavera 1250');
  assert.equal(match.counterpartPhone, '987654321');

  const quote = await specialist.ok('POST', 'contracts/quotes', {
    matchId: mutual.matchId,
    version: QUOTE_VERSION,
  });
  assert.equal(quote.current.totalCents, 5_840_000);

  const rivalQuote = await rival.ok('POST', 'contracts/quotes', {
    matchId: rivalMatch.matchId,
    version: {
      ...QUOTE_VERSION,
      permitsCents: null,
      extrasCents: null,
      stages: [{ name: 'Todo', weekFrom: 1, weekTo: 10, amountCents: 5_150_000 }],
    },
  });
  assert.equal(rivalQuote.current.permitsCents, null);

  const compared = await family.ok('GET', `contracts/quotes?projectId=${project.id}`);
  assert.equal(compared.length, 2);

  await family.ok('POST', `contracts/quotes/${quote.id}/adjustment`, {
    message: 'Por favor incluye una viga de amarre.',
  });
  const adjusted = await specialist.ok('GET', `contracts/quotes/${quote.id}`);
  assert.equal(adjusted.status, 'adjustment_requested');

  const blockedChoice = await family.call('POST', `contracts/quotes/${quote.id}/select`, {});
  assert.equal(blockedChoice.status, 409, 'no se elige una cotización con ajuste pendiente');

  const revised = await specialist.ok('POST', `contracts/quotes/${quote.id}/versions`, {
    ...QUOTE_VERSION,
    materialsCents: 3_000_000,
    changeNote: 'Se agregó la viga.',
    stages: [
      { name: 'Cimientos y estructura', weekFrom: 1, weekTo: 4, amountCents: 2_050_000 },
      { name: 'Muros y techo', weekFrom: 5, weekTo: 8, amountCents: 2_200_000 },
      { name: 'Acabados y entrega', weekFrom: 9, weekTo: 10, amountCents: 1_640_000 },
    ],
  });
  assert.equal(revised.current.version, 2);
  assert.equal(revised.previousTotalCents, 5_840_000);
  assert.equal(revised.current.totalCents, 5_890_000);

  const { contractId } = await family.ok('POST', `contracts/quotes/${quote.id}/select`, {});

  const rivalAfter = await rival.ok('GET', `contracts/quotes/${rivalQuote.id}`);
  assert.equal(rivalAfter.status, 'rejected');
  const secondChoice = await family.call('POST', `contracts/quotes/${rivalQuote.id}/select`, {});
  assert.equal(secondChoice.status, 409, 'una obra solo tiene una cotización elegida');

  const myProjects = await family.ok('GET', 'marketplace/projects/mine');
  assert.equal(myProjects.find((item) => item.id === project.id).status, 'contracted');
  const closedSwipe = await specialist.call('POST', 'marketplace/swipes/specialist', {
    projectId: project.id,
    decision: 'like',
  });
  assert.equal(closedSwipe.status, 409);

  let contract = await family.ok('GET', `contracts/contracts/${contractId}`);
  assert.equal(contract.heldCents, 2_050_000);
  assert.equal(contract.pendingCents, 3_840_000);

  const earlyReview = await family.call('POST', 'reputation/reviews', {
    contractId,
    stars: 5,
    tags: [],
  });
  assert.equal(earlyReview.status, 409, 'no se califica antes de la entrega');

  const [firstStage, secondStage, lastStage] = contract.stages;
  const prematureApproval = await family.call(
    'POST',
    `contracts/contracts/${contractId}/stages/${firstStage.id}/approve`,
    {},
  );
  assert.equal(prematureApproval.status, 409, 'no se aprueba una etapa sin terminar');

  const skippedStage = await specialist.call(
    'POST',
    `contracts/contracts/${contractId}/stages/${secondStage.id}/submit`,
    { message: 'Intento adelantarme', photoUrls: [] },
  );
  assert.equal(skippedStage.status, 409, 'no se salta una etapa');

  await specialist.ok('POST', `contracts/contracts/${contractId}/updates`, {
    message: 'Vaciamos las zapatas.',
    photoUrls: [],
  });
  await specialist.ok('POST', `contracts/contracts/${contractId}/stages/${firstStage.id}/submit`, {
    message: 'Estructura terminada.',
    photoUrls: [],
  });
  await family.ok('POST', `contracts/contracts/${contractId}/stages/${firstStage.id}/reject`, {
    message: 'Falta limpiar el área.',
  });
  contract = await family.ok('GET', `contracts/contracts/${contractId}`);
  assert.equal(contract.stages[0].status, 'in_progress');
  assert.equal(contract.stages[0].rejectionMessage, 'Falta limpiar el área.');

  await specialist.ok('POST', `contracts/contracts/${contractId}/stages/${firstStage.id}/submit`, {
    message: 'Área limpia.',
    photoUrls: [],
  });
  contract = await family.ok(
    'POST',
    `contracts/contracts/${contractId}/stages/${firstStage.id}/approve`,
    {},
  );
  assert.equal(contract.releasedCents, 2_050_000);
  assert.equal(contract.stages[1].status, 'in_progress');

  for (const stage of [secondStage, lastStage]) {
    await specialist.ok('POST', `contracts/contracts/${contractId}/stages/${stage.id}/submit`, {
      message: 'Etapa terminada.',
      photoUrls: [],
    });
    contract = await family.ok(
      'POST',
      `contracts/contracts/${contractId}/stages/${stage.id}/approve`,
      {},
    );
  }
  assert.equal(contract.status, 'completed');
  assert.equal(contract.releasedCents, contract.totalCents);

  await family.ok('POST', 'reputation/reviews', {
    contractId,
    stars: 4,
    tags: ['Puntual'],
    comment: 'Muy ordenado.',
  });
  const duplicateReview = await family.call('POST', 'reputation/reviews', {
    contractId,
    stars: 1,
    tags: [],
  });
  assert.equal(duplicateReview.status, 409);

  const blind = await specialist.ok('GET', `reputation/reviews/contract/${contractId}`);
  assert.equal(blind.counterpartSubmitted, true);
  assert.equal(blind.counterpart, null, 'la reseña se oculta hasta que ambos califican');
  assert.deepEqual(await family.ok('GET', `reputation/reviews/user/${specialist.id}`), []);

  await specialist.ok('POST', 'reputation/reviews', { contractId, stars: 5, tags: [] });
  const revealed = await specialist.ok('GET', `reputation/reviews/contract/${contractId}`);
  assert.equal(revealed.counterpart.stars, 4);

  const [updatedCard] = await family.ok('GET', `marketplace/specialists?ids=${specialist.id}`);
  assert.equal(updatedCard.rating, 4);
  assert.equal(updatedCard.reviewCount, 1);
  assert.equal(updatedCard.completedJobs, 1);
});

test('el plan Básico limita las cotizaciones y Pro lo desbloquea', async () => {
  const family = await registerFamily();
  const specialist = await registerSpecialist();
  const matchIds = [];
  for (let index = 0; index < 4; index += 1) {
    const project = await family.ok('POST', 'marketplace/projects', {
      ...PROJECT,
      title: `Prueba E2E plan ${index}`,
    });
    await family.ok('POST', 'marketplace/swipes/family', {
      projectId: project.id,
      specialistId: specialist.id,
      decision: 'like',
    });
    const { matchId } = await specialist.ok('POST', 'marketplace/swipes/specialist', {
      projectId: project.id,
      decision: 'like',
    });
    matchIds.push(matchId);
  }
  for (const matchId of matchIds.slice(0, 3)) {
    await specialist.ok('POST', 'contracts/quotes', { matchId, version: QUOTE_VERSION });
  }
  const blocked = await specialist.call('POST', 'contracts/quotes', {
    matchId: matchIds[3],
    version: QUOTE_VERSION,
  });
  assert.equal(blocked.status, 403);

  await specialist.ok('POST', 'marketplace/plan/activate', { plan: 'pro' });
  await specialist.ok('POST', 'contracts/quotes', { matchId: matchIds[3], version: QUOTE_VERSION });

  const [pro] = await family.ok('GET', `marketplace/specialists?ids=${specialist.id}`);
  assert.equal(pro.pro, true);
});
