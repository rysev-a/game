// src/models/person-models.js
// Готовые 3D-модели персонажей (.glb, например из Meshy по листу docs/art/characters.png).
// Если для набора лежит файл, createPerson сразу отдает обычного процедурного человечка, а когда файл
// загрузится, подменяет его моделью из файла. Нет файла или он не загрузился — остается процедурный.
//
// Как добавить персонажа: положить файл в models/people/<набор>.glb (например maxim.glb) и вписать
// набор в PERSON_MODEL_FILES ниже. Модель приводится к росту ~2 юнита, ступни на земле.
// Анимации берутся из файла по имени: ходьба — клип, в имени которого есть «walk», стояние — «idle».
// Без клипа ходьбы модель просто стоит. Вещи (браслет, оружие) крепятся к костям кистей,
// если они есть в скелете (имя кости с «hand» и «left»/«right»), иначе — к процедурной руке.
//
// Подключение: после three.js, GLTFLoader.js, SkeletonUtils.js и person.js.

// Набор -> файл и поворот: модели из Meshy смотрят в +Z, наши человечки — в -Z, поэтому yaw = PI
const PERSON_MODEL_FILES = {
  // maxim: { file: 'models/people/maxim.glb', yaw: Math.PI },
};

const personModelCache = new Map(); // набор -> Promise<gltf | null>

function loadPersonModel(type) {
  if (!personModelCache.has(type)) {
    const def = PERSON_MODEL_FILES[type];
    const p = new Promise((resolve) => {
      if (!def || typeof THREE.GLTFLoader === 'undefined') return resolve(null);
      new THREE.GLTFLoader().load(
        def.file,
        (gltf) => resolve(gltf),
        undefined,
        (err) => {
          console.warn('person-models: не загрузился ' + def.file, err);
          resolve(null);
        },
      );
    });
    personModelCache.set(type, p);
  }
  return personModelCache.get(type);
}

// Кость кисти: «hand» + сторона в имени (mixamo: mixamorigLeftHand, Meshy: LeftHand / hand_l)
function findHandBone(root, side) {
  let found = null;
  const re = side === 'L' ? /(left|_l\b|\.l\b)/i : /(right|_r\b|\.r\b)/i;
  root.traverse((o) => {
    if (!found && o.isBone && /hand/i.test(o.name) && re.test(o.name)) found = o;
  });
  return found;
}

// Подменить процедурного человечка man моделью набора type, когда она загрузится
function attachPersonModel(man, type) {
  if (!PERSON_MODEL_FILES[type]) return;
  const def = PERSON_MODEL_FILES[type];
  loadPersonModel(type).then((gltf) => {
    if (!gltf) return;
    const model = THREE.SkeletonUtils.clone(gltf.scene);
    // Рост ~2 юнита, ступни на y = 0, центр по X/Z
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const k = size.y > 0 ? 2 / size.y : 1;
    model.scale.setScalar(k);
    model.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);
    const holder = new THREE.Group();
    holder.rotation.y = def.yaw || 0;
    holder.add(model);
    model.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false; // у skinned-моделей рамка не следует за анимацией
    });

    const rig = man.userData.rig;
    rig.hips.visible = false; // процедурное тело прячем, но оставляем: позы и логика опираются на него
    man.add(holder);

    // Анимации: ходьба синхронизируется с фазой шага, стояние играет само
    const mixer = new THREE.AnimationMixer(model);
    const clip = (re) => gltf.animations.find((a) => re.test(a.name));
    const walkClip = clip(/walk/i);
    const idleClip = clip(/idle/i);
    const walk = walkClip ? mixer.clipAction(walkClip) : null;
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    if (walk) walk.play();
    if (idle) idle.play();
    let lastT = null;
    const baseUpdate = man.updateWalk;
    man.updateWalk = function (t, amp = 1) {
      baseUpdate(t, amp);
      if (walk) {
        walk.weight = amp;
        walk.time = (((t / (Math.PI * 2)) % 1) + 1) % 1 * walkClip.duration;
      }
      if (idle) {
        idle.weight = 1 - amp;
        if (lastT !== null) idle.time = (idle.time + 1 / 60) % idleClip.duration;
      }
      lastT = t;
      mixer.update(0);
    };
    man.updateWalk(0, 0);

    // Вещи в руках и на запястьях — к костям кистей; уже надетые переносим
    const bones = { L: findHandBone(model, 'L'), R: findHandBone(model, 'R') };
    const boneFor = (slot) => (slot === 'wristL' ? bones.L : bones.R);
    const baseAttach = man.attach;
    man.attach = function (slot, obj) {
      const bone = boneFor(slot);
      if (!bone) return baseAttach(slot, obj);
      bone.add(obj);
      obj.position.set(0, 0, 0);
      obj.rotation.set(0, 0, 0);
      // Размер вещи — как у процедурного человечка, независимо от масштаба скелета
      man.updateMatrixWorld(true);
      obj.scale.setScalar(man.getWorldScale(new THREE.Vector3()).x / bone.getWorldScale(new THREE.Vector3()).x);
      return obj;
    };
    for (const [slot, obj] of rig.attached) if (obj.parent) man.attach(slot, obj);
  });
}
