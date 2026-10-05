// Pruebas del motor de ruteo VRP. Ejecutar con: npm run test:routing
import assert from "node:assert";
import {
  haversineKm,
  routeDistanceKm,
  nearestNeighborRoute,
  twoOpt,
  kMeansAssignments,
  optimizeRoutes,
  type DeliveryStop,
} from "../src/lib/routing";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

// PRNG para generar paradas reproducibles en las pruebas
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomStops(n: number, seed: number): DeliveryStop[] {
  const rand = seeded(seed);
  // Alrededor de Pasto (1.21, -77.28), dispersión ~0.3°
  return Array.from({ length: n }, (_, i) => ({
    orderId: `o${i}`,
    lat: 1.21 + (rand() - 0.5) * 0.6,
    lng: -77.28 + (rand() - 0.5) * 0.6,
    municipio: i % 2 === 0 ? "Pasto" : "Túquerres",
  }));
}

console.log("\n🧪 Motor de ruteo VRP\n");

test("haversine: 1° de longitud en el ecuador ≈ 111.19 km", () => {
  const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(d - 111.19) < 1, `esperado ~111.19, obtenido ${d}`);
});

test("haversine: distancia idéntica es 0 y es simétrica", () => {
  const a = { lat: 1.21, lng: -77.28 };
  const b = { lat: 1.08, lng: -77.62 };
  assert.strictEqual(haversineKm(a, a), 0);
  assert.ok(Math.abs(haversineKm(a, b) - haversineKm(b, a)) < 1e-9);
});

test("routeDistanceKm: ruta vacía = 0", () => {
  assert.strictEqual(routeDistanceKm({ lat: 1, lng: 1 }, []), 0);
});

test("2-opt nunca empeora al vecino más cercano", () => {
  for (const seed of [1, 7, 13, 99, 2024]) {
    const stops = randomStops(25, seed);
    const depot = { lat: 1.21, lng: -77.28 };
    const nn = nearestNeighborRoute(depot, stops);
    const opt = twoOpt(depot, nn);
    const nnDist = routeDistanceKm(depot, nn);
    const optDist = routeDistanceKm(depot, opt);
    assert.ok(
      optDist <= nnDist + 1e-9,
      `seed ${seed}: 2-opt ${optDist.toFixed(2)} > nn ${nnDist.toFixed(2)}`
    );
  }
});

test("2-opt conserva todas las paradas (permutación)", () => {
  const stops = randomStops(20, 5);
  const depot = { lat: 1.21, lng: -77.28 };
  const opt = twoOpt(depot, nearestNeighborRoute(depot, stops));
  assert.strictEqual(opt.length, stops.length);
  const ids = opt.map((s) => s.orderId).sort();
  assert.deepStrictEqual(ids, stops.map((s) => s.orderId).sort());
});

test("k-means es determinista con la misma semilla", () => {
  const pts = randomStops(40, 3).map((s) => ({ lat: s.lat, lng: s.lng }));
  const a = kMeansAssignments(pts, 4, { seed: 123 });
  const b = kMeansAssignments(pts, 4, { seed: 123 });
  assert.deepStrictEqual(a, b);
});

test("k-means asigna cada punto a un clúster en [0, k)", () => {
  const pts = randomStops(30, 11).map((s) => ({ lat: s.lat, lng: s.lng }));
  const k = 3;
  const asg = kMeansAssignments(pts, k, { seed: 1 });
  assert.strictEqual(asg.length, pts.length);
  for (const c of asg) assert.ok(c >= 0 && c < k);
});

test("optimizeRoutes: casos límite (vacío y una parada)", () => {
  const empty = optimizeRoutes([]);
  assert.strictEqual(empty.routes.length, 0);
  assert.strictEqual(empty.totalDistanceKm, 0);

  const one = optimizeRoutes([{ orderId: "x", lat: 1.2, lng: -77.3 }]);
  assert.strictEqual(one.routes.length, 1);
  assert.strictEqual(one.routes[0].stopCount, 1);
});

test("optimizeRoutes: cubre todas las paradas exactamente una vez", () => {
  const stops = randomStops(50, 42);
  const res = optimizeRoutes(stops, { capacity: 10, seed: 7 });
  const seen = new Set<string>();
  let total = 0;
  for (const r of res.routes) {
    for (const s of r.sequence) {
      assert.ok(!seen.has(s.orderId), `parada duplicada: ${s.orderId}`);
      seen.add(s.orderId);
      total++;
    }
  }
  assert.strictEqual(total, stops.length);
  assert.strictEqual(seen.size, stops.length);
});

test("optimizeRoutes: número de rutas ≤ k derivado de la capacidad", () => {
  const stops = randomStops(50, 42);
  const capacity = 10;
  const res = optimizeRoutes(stops, { capacity, seed: 7 });
  const expectedK = Math.ceil(stops.length / capacity);
  assert.ok(res.routes.length <= expectedK, `${res.routes.length} > ${expectedK}`);
});

test("optimizeRoutes: el optimizado ahorra vs. el caso naive", () => {
  const stops = randomStops(60, 2026);
  const res = optimizeRoutes(stops, { capacity: 12, seed: 5 });
  assert.ok(
    res.totalDistanceKm <= res.naiveDistanceKm + 1e-9,
    `optimizado ${res.totalDistanceKm.toFixed(2)} > naive ${res.naiveDistanceKm.toFixed(2)}`
  );
  assert.ok(res.savingsVsNaivePct >= 0);
});

test("optimizeRoutes: 2-opt mejora (o iguala) al vecino más cercano global", () => {
  const stops = randomStops(60, 2026);
  const res = optimizeRoutes(stops, { capacity: 12, seed: 5 });
  assert.ok(
    res.totalDistanceKm <= res.nearestNeighborDistanceKm + 1e-9,
    `optimizado ${res.totalDistanceKm.toFixed(2)} > nn ${res.nearestNeighborDistanceKm.toFixed(2)}`
  );
});

test("optimizeRoutes: ignora coordenadas inválidas (0,0)", () => {
  const stops: DeliveryStop[] = [
    { orderId: "a", lat: 1.2, lng: -77.3 },
    { orderId: "bad", lat: 0, lng: 0 },
    { orderId: "b", lat: 1.3, lng: -77.4 },
  ];
  const res = optimizeRoutes(stops);
  const ids = res.routes.flatMap((r) => r.sequence.map((s) => s.orderId));
  assert.ok(!ids.includes("bad"));
  assert.strictEqual(ids.length, 2);
});

test("métrica de ejemplo: ahorro del 2-opt sobre NN en 25 paradas", () => {
  const stops = randomStops(25, 17);
  const depot = { lat: 1.21, lng: -77.28 };
  const nnDist = routeDistanceKm(depot, nearestNeighborRoute(depot, stops));
  const optDist = routeDistanceKm(depot, twoOpt(depot, nearestNeighborRoute(depot, stops)));
  const improvement = ((nnDist - optDist) / nnDist) * 100;
  console.log(
    `      NN=${nnDist.toFixed(1)}km  2-opt=${optDist.toFixed(1)}km  mejora=${improvement.toFixed(1)}%`
  );
  assert.ok(optDist <= nnDist + 1e-9);
});

console.log(`\n✅ ${passed} pruebas superadas\n`);
