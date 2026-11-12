// data only (plus one tiny room() builder). meters, y up, yaw 0 faces -z.
// surface t: 'floor' | 'wall' (portalable) | 'metal' (NOT portalable). p = center, s = size [w,h,d].
// exit = center of the elevator cab (built by the loader, door faces +z). a button linking doors:['elev'] opens it.
const room=(cx,cz,w,d,h,wt='wall',fl=true)=>[
  ...(fl?[{t:'floor',p:[cx,-.5,cz],s:[w,1,d]}]:[]),
  {t:'metal',p:[cx,h+.5,cz],s:[w,1,d]},
  {t:wt,p:[cx,h/2,cz-d/2-.5],s:[w+2,h,1]},{t:wt,p:[cx,h/2,cz+d/2+.5],s:[w+2,h,1]},
  {t:wt,p:[cx-w/2-.5,h/2,cz],s:[1,h,d]},{t:wt,p:[cx+w/2+.5,h/2,cz],s:[1,h,d]}];
const split=[{t:'wall',p:[-3.75,2.5,0],s:[4.5,5,1]},{t:'wall',p:[3.75,2.5,0],s:[4.5,5,1]},{t:'wall',p:[0,4,0],s:[3,2,1]}];
const door={id:'d1',p:[0,1.5,0],s:[3,3,1]};
const win=[{t:'metal',p:[-3.75,3,0],s:[4.5,6,1]},{t:'metal',p:[3.75,3,0],s:[4.5,6,1]},{t:'metal',p:[0,.75,0],s:[3,1.5,1]},{t:'metal',p:[0,4.75,0],s:[3,2.5,1]}];
const split9=[{t:'metal',p:[-3.75,5,4],s:[4.5,10,1]},{t:'metal',p:[3.75,5,4],s:[4.5,10,1]},{t:'metal',p:[0,6.5,4],s:[3,7,1]}];

export const LEVELS=[
{name:'walk',hint:'e grabs the cube. cube on the button opens the elevator. portals are optional here.',
 spawn:[0,.6,6],yaw:0,exit:[0,0,-5],surfaces:room(0,0,12,16,5),buttons:[{p:[4,.05,0],doors:['elev']}],cubes:[[-3,.5,4]],lights:[[0,4.5,3],[0,4.5,-4]]},
{name:'over the wall',hint:'aim high at the far wall, other portal at your feet. throw the cube through too.',
 spawn:[0,.6,8],yaw:0,exit:[-4,0,-5],surfaces:[...room(0,0,12,20,8),{t:'wall',p:[0,1.5,0],s:[12,3,1]}],
 buttons:[{p:[3,.05,-7],doors:['elev']}],cubes:[[3,.5,6]],lights:[[0,7,6],[0,7,-6]]},
{name:'up the ledge',hint:'portal above the ledge on the far wall, other on the floor. cube goes up with you.',
 spawn:[0,.6,6],yaw:0,exit:[-3.5,3,-4.5],surfaces:[...room(0,0,12,16,9),{t:'floor',p:[0,1.5,-5],s:[12,3,6]}],
 buttons:[{p:[3.5,3.05,-4],doors:['elev']}],cubes:[[3,.5,3]],lights:[[0,8,4],[0,8,-4]]},
{name:'weight',hint:'one cube holds the partition door open, the other goes on the second button.',
 spawn:[0,.6,8],yaw:0,exit:[0,0,-6],surfaces:[...room(0,0,12,20,5),...split],doors:[door],
 buttons:[{p:[3.5,.05,5],doors:['d1']},{p:[4.5,.05,-3],doors:['elev']}],cubes:[[-3,.5,6],[3,.5,6]],lights:[[0,4.5,5],[0,4.5,-5]]},
{name:'three cubes',hint:'two buttons, one door, then a third cube for the elevator.',
 spawn:[0,.6,8],yaw:0,exit:[0,0,-6],surfaces:[...room(0,0,12,20,5),...split],doors:[door],
 buttons:[{p:[-4.5,.05,3],doors:['d1']},{p:[4.5,.05,3],doors:['d1']},{p:[4.5,.05,-3],doors:['elev']}],
 cubes:[[-3,.5,7],[3,.5,7],[-4.5,.5,-3]],radios:[[4.5,.3,9]],lights:[[0,4.5,5],[0,4.5,-5]]},
{name:'fling',hint:'cube on the button first. then turn around: back wall, high up = orange. blue on the floor below the ledge. jump.',
 spawn:[0,10.6,8],yaw:0,exit:[5,0,-10.5],
 surfaces:[...room(0,-2,16,24,16,'wall',false),{t:'floor',p:[0,5,6.5],s:[16,10,7]},{t:'floor',p:[0,-.5,1],s:[16,1,4]},{t:'floor',p:[0,-.5,-10.5],s:[16,1,7]}],
 buttons:[{p:[5,10.05,6],doors:['elev']}],cubes:[[-3,10.5,6]],radios:[[-6,10.3,8]],lights:[[0,14,6],[0,8,-8],[0,8,1]]},
{name:'the window',hint:'all metal except one slab. shoot it through the window. cube has to cross too.',
 spawn:[0,.6,9],yaw:0,exit:[-4,0,-7],surfaces:[...room(0,0,12,24,6,'metal'),...win,{t:'wall',p:[0,3,-11.75],s:[4,4,.5]}],
 buttons:[{p:[4,.05,-6],doors:['elev']}],cubes:[[3,.5,6]],radios:[[-4,.3,10]],lights:[[0,5.5,6],[0,5.5,-6]]},
{name:'lift',hint:'metal everywhere but the slab up high. get the cube onto the ledge button, then come back down.',
 spawn:[0,.6,8.5],yaw:0,exit:[-4,0,4],surfaces:[...room(0,0,12,20,10,'metal'),{t:'floor',p:[0,2,-7],s:[12,4,6]},{t:'wall',p:[0,7,-9.75],s:[6,4,.5]}],
 buttons:[{p:[3,4.05,-7],doors:['elev']}],cubes:[[3,.5,8]],lights:[[0,9,4],[0,9,-5]]},
{name:'gate and lift',hint:'cube 1 holds the gate open. cube 2 goes through, up the ledge, onto the button.',
 spawn:[0,.6,12],yaw:0,exit:[-4,0,-1],surfaces:[...room(0,0,12,28,10,'metal'),...split9,{t:'floor',p:[0,2,-11],s:[12,4,6]},{t:'wall',p:[0,7,-13.75],s:[6,4,.5]}],
 doors:[{id:'d1',p:[0,1.5,4],s:[3,3,1]}],buttons:[{p:[4,.05,7],doors:['d1']},{p:[3,4.05,-11],doors:['elev']}],
 cubes:[[-3,.5,10],[3,.5,10]],lights:[[0,9,8],[0,9,-2],[0,9,-10]]},
{name:'sentry',hint:'turret. hide behind the pillars. portals skip line of sight. knocked over = dead turret.',
 spawn:[0,.6,10],yaw:0,exit:[-4,0,-8],surfaces:[...room(0,0,12,24,6),{t:'metal',p:[-2,1.25,4],s:[3,2.5,1]},{t:'metal',p:[2,1.25,-2],s:[3,2.5,1]}],
 turrets:[{p:[0,.6,-9],yaw:0}],buttons:[{p:[4.5,.05,-5],doors:['elev']}],cubes:[[3,.5,9]],lights:[[0,5.5,6],[0,5.5,-4]]}
];
