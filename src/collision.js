// Simple SAT for convex polygons
function project(vertices, axis){
  let min = Infinity, max = -Infinity;
  for(const p of vertices){
    const proj = p.x*axis.x + p.y*axis.y;
    if(proj < min) min = proj; if(proj > max) max = proj;
  }
  return {min, max};
}

function normalize(v){
  const l = Math.hypot(v.x,v.y) || 1; return {x: v.x/l, y: v.y/l};
}

export function polygonsCollide(a, b){
  const polys = [a,b];
  for(let k=0;k<2;k++){
    const verts = polys[k];
    for(let i=0;i<verts.length;i++){
      const p1 = verts[i];
      const p2 = verts[(i+1)%verts.length];
      const edge = {x: p2.x - p1.x, y: p2.y - p1.y};
      const axis = normalize({x: -edge.y, y: edge.x});
      const A = project(a, axis);
      const B = project(b, axis);
      if(A.max < B.min || B.max < A.min) return false;
    }
  }
  return true;
}
