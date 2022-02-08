import "./stylesheets/main.css";
const {FontLoader} = require("../node_modules/three/examples/jsm/loaders/FontLoader.js");
const {TextGeometry} = require("../node_modules/three/examples/jsm/geometries/TextGeometry.js");
const THREE = require("three");
global.THREE = THREE;
const HoloPlay = require("./holoplay");

var scene, camera, renderer,raycaster, holoplay, fontLoader, helvetiker_regular;
var directionalLight, ambientLight, cubeGeometry;
var playerSelected = false;
var currentCubes = []

/******************************
 *  Part 1: PLAYER SELECTION  *
 *****************************/

// Fetch players 
async function fetchCurrentlyPlayingContentData(option){
  var base = "http://" +  option.hostname + ":" + option.port;
  var url = base + option.url +  option.token;
  var res = await fetch(url)
  var txt = await res.text();
  var dom = await new window.DOMParser().parseFromString(txt, "text/xml");
  var totalTracks = [];
  var tracks = dom.getElementsByTagName("Track");

  if(tracks.length > 0){
    for(var track of tracks){
      let tempTrack = {
        thumbnail: (track) ? base + track.getAttribute("thumb") + option.token : "",
        title: (track)?track.getAttribute("title"):"",
        machineId: (track.getElementsByTagName('Player')[0]) ? track.getElementsByTagName('Player')[0].getAttribute("machineIdentifier"):"",
        user :{
          avatar : (track.getElementsByTagName('User')[0]) ? base + track.getElementsByTagName('User')[0].getAttribute("thumb") + option.token :"",
          name: (track.getElementsByTagName('User')[0]) ?  track.getElementsByTagName('User')[0].getAttribute("title") : ""
        }
      }
      totalTracks.push(tempTrack);
    }
  }
  return totalTracks;
}

// Initializer for the Three.js scene, adds camera, lights, text and window resize function
function init() {
  scene = new THREE.Scene();
  raycaster = new THREE.Raycaster();
  fontLoader = new FontLoader();
  camera = new THREE.PerspectiveCamera(12.5, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.updateProjectionMatrix();
  camera.position.set(0, 0, 20);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  holoplay = new HoloPlay(scene, camera, renderer);
  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 2);
  scene.add(directionalLight);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  // Set Text
  fontLoader.load("../node_modules/three/examples/fonts/helvetiker_regular.typeface.json", (font) => {
    helvetiker_regular = font
    var textGeometry = new TextGeometry( "Choose your player", {
      font: helvetiker_regular,
      size: 0.1,
      height: 0,
      curveSegments: 0.1,
      bevelThickness: 0,
      bevelSize:0,
      bevelEnabled: true
    });
  
    var textMaterial = new THREE.MeshPhongMaterial( 
      { color: 0xff0000, specular: 0xffffff }
    );
    textGeometry.computeBoundingBox();
    var centerOffset = -0.5 * ( textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x );
    var textMesh = new THREE.Mesh( textGeometry, textMaterial );
    textMesh.position.x = centerOffset;
    textMesh.position.set(-0.6, -2, 0)
    scene.add(textMesh);
  });

  window.addEventListener("resize", function () {
    var width = window.innerWidth;
    var height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

// Show the player cubes according to the players fetched
function showCubes(totalTracks){
  // The positions for top left, top-right, mid left, mid-right, bot-left and bot-right
  var positions = [[-0.7, 1.2, 0],[0.7, 1.2, 0],[-0.7, 0, 0],[0.7, 0, 0],[-0.7, -1.2, 0],[0.7, -1.2, 0]]

  cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  currentCubes.forEach(c => {
    var selectedObject = scene.getObjectByName(c);
    scene.remove( selectedObject );
  });

  currentCubes = [];

  for(var [index, track] of totalTracks.entries()){
    var cube;
    var cubeMaterial = new THREE.MeshBasicMaterial( { map: new THREE.TextureLoader().load( track.thumbnail )});
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(positions[index][0],positions[index][1],positions[index][2]);
    cube.name = track.title;
    scene.add(cube);
    currentCubes.push(track.title);
    addObjectClickListener(camera, scene, raycaster, cube,function(){
      playerSelected = true;
      watchPlayer(track.machineId);
    });
  }
}

// Renderer loop
function RunApp() {
  requestAnimationFrame(RunApp);
  holoplay.render();
}

// Player page setup, calls init, renderer loop and fetches players data
async function setup(){
  var option = {
    hostname:"192.168.86.21",
    port:"32400",
    token:"?X-Plex-Token=FYC68gFcdLG3sF-UfDsv",
    url:"/status/sessions"
  }

  init();
  RunApp();

  // Fetch player data every 5 seconds and display it, until one is selected
  while(!playerSelected){
    var totalTracks = await fetchCurrentlyPlayingContentData(option);
    showCubes(totalTracks);

    await waitFor(15000);
  }
}

// MAIN 
setup();

/*****************************
 * Part 2 : SHOW MUSIC DATA  *
 *****************************/
// TODO


/*********************
 * HELPER FUNCTIONS  *
 **********************/
// Simple promise timeout function
const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));

// Listener for Three.js object (based on raycaster)
const addObjectClickListener = ( camera, scene, raycaster, objectToWatch, onMouseClick,) => {
  const objectToWatchId = objectToWatch.uuid;
  let mouse = new THREE.Vector2();
  document.addEventListener("click", (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      const isIntersected = intersects.find(
        (intersectedEl) => intersectedEl.object.uuid === objectToWatchId
      );
      if (isIntersected) {
        onMouseClick();
      }
    },
    false
  );
};
