export function wrapPosition(pos, w, h){
  let x = pos.x, y = pos.y;
  if(x < 0) x += w; if(x > w) x -= w;
  if(y < 0) y += h; if(y > h) y -= h;
  return {x,y};
}

export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

export function rotatePoint(px, py, angle){
  const c = Math.cos(angle), s = Math.sin(angle);
  return {x: px * c - py * s, y: px * s + py * c};
}

export function add(a,b){return {x: a.x + b.x, y: a.y + b.y}};
export function sub(a,b){return {x: a.x - b.x, y: a.y - b.y}};
export function mul(a,s){return {x: a.x * s, y: a.y * s}};
export function length(v){return Math.hypot(v.x, v.y)}
