// data only (plus one tiny room() builder). meters, y up, yaw 0 faces -z.
// surface t: 'floor' | 'wall' (both portalable) | 'metal' (NOT portalable). p = center, s = size [w,h,d].
const room=(cx,cz,w,d,h)=>[
  {t:'floor',p:[cx,-.5,cz],s:[w,1,d]},
  {t:'metal',p:[cx,h+.5,cz],s:[w,1,d]},
  {t:'wall',p:[cx,h/2,cz-d/2-.5],s:[w+2,h,1]},
  {t:'wall',p:[cx,h/2,cz+d/2+.5],s:[w+2,h,1]},
  {t:'wall',p:[cx-w/2-.5,h/2,cz],s:[1,h,d]},
  {t:'wall',p:[cx+w/2+.5,h/2,cz],s:[1,h,d]}];
const split=[{t:'wall',p:[-3.75,2.5,0],s:[4.5,5,1]},{t:'wall',p:[3.75,2.5,0],s:[4.5,5,1]},{t:'wall',p:[0,4,0],s:[3,2,1]}];
const door={id:'d1',p:[0,1.5,0],s:[3,3,1]};

export const LEVELS=[
{name:'walk',hint:'wasd + space. reach the green pad. lmb blue, rmb orange, try floor and walls.',
 spawn:[0,.6,6],yaw:0,exit:[0,0,-6],surfaces:room(0,0,12,16,5),lights:[[0,4.5,3],[0,4.5,-4]]},
{name:'over the wall',hint:'aim high at the far wall for one portal, put the other at your feet, jump in.',
 spawn:[0,.6,8],yaw:0,exit:[0,0,-5],surfaces:[...room(0,0,12,20,8),{t:'wall',p:[0,1.5,0],s:[12,3,1]}],lights:[[0,7,6],[0,7,-6]]},
{name:'up the ledge',hint:'portal on the far wall above the ledge, other one on the floor.',
 spawn:[0,.6,6],yaw:0,exit:[0,3,-6],surfaces:[...room(0,0,12,16,9),{t:'floor',p:[0,1.5,-5],s:[12,3,6]}],lights:[[0,8,4],[0,8,-4]]},
{name:'weight',hint:'e grabs the cube. put it on the button.',
 spawn:[0,.6,8],yaw:0,exit:[0,0,-6],surfaces:[...room(0,0,12,20,5),...split],doors:[door],
 buttons:[{p:[3.5,.05,5],doors:['d1']}],cubes:[[-3,.5,6]],lights:[[0,4.5,5],[0,4.5,-5]]},
{name:'two buttons',hint:'two buttons, one door, two cubes.',
 spawn:[0,.6,8],yaw:0,exit:[0,0,-6],surfaces:[...room(0,0,12,20,5),...split],doors:[door],
 buttons:[{p:[-4.5,.05,3],doors:['d1']},{p:[4.5,.05,3],doors:['d1']}],cubes:[[-3,.5,7],[3,.5,7]],radios:[[4.5,.3,9]],lights:[[0,4.5,5],[0,4.5,-5]]}
];
