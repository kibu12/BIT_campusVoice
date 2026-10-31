import roadNetwork from './campus_road_network.json';

// Place ID to Nearest Road / Corridor Node Mapping (Accurate GeoBITs Graph)
export const PLACE_NODE_MAP = {
  // Main Landmarks & Gates
  'main-gate': '001',
  'guest-house': '002',
  'main-parking': '002',
  'principal-office': '007',
  'smart-agri-fields': '006',
  'bus': '004',
  
  // Sunflower & Special Blocks
  'sf-block': '017',
  'sf-block-labs': '016',
  'mechanic-back': '020',
  'mechanic-front': '020',
  'special-labs': '113',
  'as-main-right': '113',
  'ai-lab': '113',
  
  // AS Block & Ribs (Corridor in middle of AS ribs)
  'as-main-left': '113',
  'as-block': '113',
  'as-rib-1': '114',
  'as-rib-2': '114',
  'as-rib-3': '116',
  'as-rib-4': '116',
  'as-rib-5': '126',
  'as-rib-6': '126',
  'as-rib-7': '128',
  'as-rib-8': '128',
  'as-rib-9': '130',
  'as-rib-10': '130',
  'as-rib-11': '132',
  'as-rib-12': '132',
  
  // IB Block & Ribs (Corridor in middle of IB ribs)
  'ib-block': '103',
  'ib-block-1': '103',
  'ib-block-2': '103',
  'placement-cell': '103',
  'department-of-training-and-placement': '103',
  'ib-rib-1': '104',
  'ib-rib-2': '108',
  'ib-rib-3': '136',
  'ib-rib-4': '137',
  'ib-rib-5': '135',
  'ib-rib-6': '138',
  'ib-rib-7': '134',
  'ib-rib-8': '141',
  'ib-rib-9': '109',
  'ib-rib-10': '142',
  'ib-rib-11': '106',
  'ib-rib-12': '143',
  
  // Central Hubs
  'library': '084',
  'main-auditorium': '084',
  'cafeteria': '036',
  'canteen-boys': '036',
  'canteen-girls': '148',
  
  // Hostels
  'coral': '025',
  'emerald': '027',
  'diamond': '030',
  'sapphire': '032',
  'ruby': '038',
  'pearl': '078',
  'boys-mess': '048',
  'ganga': '124',
  'yamuna': '114',
  'narmadha': '126',
  'kaveri': '128',
  'middle-bhavani': '116',
  'girls-mess': '148',
  
  // Facilities & Sports
  'medical-centre': '120',
  'west-gate': '120',
  'west-parking': '119',
  'cricket-ground': '144',
  'football-ground': '012',
  'basket-ball-court': '094',
  'volley-ball-court': '097',
  'tennis-court-2': '092',
  'staff-quarters': '013'
};

// Build Weighted Adjacency Graph
const roadGraph = {};
roadNetwork.edges.forEach(e => {
  const f = e.from;
  const t = e.to;
  const w = e.weight || 30.0;
  const sid = e.segId;
  
  if (!roadGraph[f]) roadGraph[f] = [];
  if (!roadGraph[t]) roadGraph[t] = [];
  
  roadGraph[f].push({ node: t, weight: w, segId: sid });
  roadGraph[t].push({ node: f, weight: w, segId: sid });
});

// Calculate Shortest Road Route using Dijkstra Algorithm
export function findShortestRoadRoute(startPlaceId, endPlaceId) {
  const startNode = PLACE_NODE_MAP[startPlaceId] || '001';
  const endNode = PLACE_NODE_MAP[endPlaceId] || '084';

  if (startNode === endNode) {
    return { segments: [], nodes: [startNode], distance: 30, estimatedMinutes: 1 };
  }

  // Min-Priority Queue for Dijkstra
  const distances = { [startNode]: 0 };
  const previous = {};
  const segmentTo = {};
  const unvisited = new Set(Object.keys(roadGraph));

  while (unvisited.size > 0) {
    // Find node in unvisited with smallest distance
    let currNode = null;
    let shortestDist = Infinity;
    
    for (const node of unvisited) {
      const d = distances[node] !== undefined ? distances[node] : Infinity;
      if (d < shortestDist) {
        shortestDist = d;
        currNode = node;
      }
    }

    if (!currNode || shortestDist === Infinity) break;
    if (currNode === endNode) break;

    unvisited.delete(currNode);

    const neighbors = roadGraph[currNode] || [];
    for (const { node: neighbor, weight, segId } of neighbors) {
      if (unvisited.has(neighbor)) {
        const alt = distances[currNode] + weight;
        if (alt < (distances[neighbor] !== undefined ? distances[neighbor] : Infinity)) {
          distances[neighbor] = alt;
          previous[neighbor] = currNode;
          segmentTo[neighbor] = segId;
        }
      }
    }
  }

  // Reconstruct path
  const pathNodes = [];
  const pathSegments = [];
  let curr = endNode;

  while (curr && previous[curr]) {
    pathNodes.unshift(curr);
    if (segmentTo[curr]) {
      pathSegments.unshift(segmentTo[curr]);
    }
    curr = previous[curr];
  }

  if (curr === startNode) {
    pathNodes.unshift(startNode);
  }

  const rawDist = distances[endNode] || (pathSegments.length * 25);
  // Scale coordinate pixels to realistic walking meters
  const distMeters = Math.max(40, Math.round(rawDist * 0.45));
  const estimatedMins = Math.max(1, Math.round(distMeters / 65));

  return {
    segments: pathSegments,
    nodes: pathNodes,
    distance: distMeters,
    estimatedMinutes: estimatedMins
  };
}
