// src/locations/bridge/bridge.js
// Река и мост. Река течет в русле НИЖЕ уровня земли (землю режет src/world/ground.js): наклонные
// песчаные берега, синяя вода без анимации, мост с опорами и перилами по трассе. Русло —
// препятствие для машин и пешеходов, перебраться можно только по мосту.

const riverWidth = riverHalf * 2; // русло по верху берегов
const riverLen = worldRadius * 2 + 200; // через весь мир (круглый, с запасом за забор)
const riverDepth = 1.2; // глубина русла
const waterLevel = -0.8;
const bridgeLen = riverWidth + 6;
const bridgeHalfW = 6.25;
{
  // Берега: наклонные плоскости от края земли ко дну русла
  const bankInner = riverHalf - 4;
  for (const side of [-1, 1]) {
    const xTop = riverX + side * riverHalf;
    const xLow = riverX + side * bankInner;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          xTop, 0, -riverLen / 2, xLow, -riverDepth, -riverLen / 2, xLow, -riverDepth, riverLen / 2,
          xTop, 0, -riverLen / 2, xLow, -riverDepth, riverLen / 2, xTop, 0, riverLen / 2,
        ],
        3,
      ),
    );
    cityGroup.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xa09266, side: THREE.DoubleSide })));
    flatRect(2, riverLen, 0xb8a878, 0.008, riverX + side * (riverHalf + 1), 0); // песчаная кромка
  }
  // Вода: пересекает склоны на уровне waterLevel (≈13,3 юнита от оси)
  flatRect(26.8, riverLen, 0x2f6fae, waterLevel, riverX, 0);

  // Мост: толстый настил над водой, две опоры, перила
  const deck = boxWithEdges(bridgeLen, 0.6, bridgeHalfW * 2, 0x8a8a8a);
  deck.position.set(riverX, 0.012 - 0.3, 0);
  cityGroup.add(deck);
  for (const dx of [-6, 6]) {
    const pier = boxWithEdges(1.4, 1.6, bridgeHalfW * 2 - 2, 0x7a7a7a);
    pier.position.set(riverX + dx, -1.4, 0);
    cityGroup.add(pier);
  }
}
for (const side of [-1, 1]) {
  const rail = boxWithEdges(bridgeLen, 1, 0.3, 0xa0a0a0);
  rail.position.set(riverX, 0.5, side * (bridgeHalfW - 0.15));
  cityGroup.add(rail);
  for (let i = 0; i <= 8; i++) {
    const post = boxWithEdges(0.5, 1.5, 0.5, 0x8a8a8a);
    post.position.set(riverX - bridgeLen / 2 + (bridgeLen * i) / 8, 0.75, side * (bridgeHalfW - 0.15));
    cityGroup.add(post);
  }
  addObstacle({ x: riverX, z: side * (bridgeHalfW - 0.15), hx: bridgeLen / 2, hz: 0.25 });
  // Русло по обе стороны от моста
  const waterHalf = (riverLen / 2 - bridgeHalfW) / 2;
  addObstacle({ x: riverX, z: side * (bridgeHalfW + waterHalf), hx: riverHalf, hz: waterHalf });
}
// На карте река обрезана по кругу мира
mapObjects.push({
  x: riverX,
  z: worldCenter.z,
  hx: 13.4,
  hz: Math.sqrt(worldRadius ** 2 - (riverX - worldCenter.x) ** 2),
  color: '#2f6fae',
  ground: true,
});
mapObjects.push({ x: riverX, z: 0, hx: bridgeLen / 2, hz: bridgeHalfW, color: '#8a8a8a', ground: true });

// Зона реки: звук воды и никакого леса
registerZone(
  'river',
  'Река',
  { x1: riverX - riverHalf - 2, x2: riverX + riverHalf + 2, z1: -1000, z2: 1000 },
  { river_2: 0.7, river: 0.3 },
);
clearZones.push({ x1: riverX - 18, x2: riverX + 18, z1: -1000, z2: 1000 });
